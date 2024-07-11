// Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package auth

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"math/big"
	"reflect"
	"time"

	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/crypto"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/eip712"
	"github.com/ava-labs/hypersdk/utils"
	"github.com/ethereum/go-ethereum/common/math"
	ethCrypto "github.com/ethereum/go-ethereum/crypto"
)

var _ chain.Auth = (*EIP712)(nil)

const (
	EIP712ComputeUnits = 10      // can't be batched like ed25519
	EIP712Size         = 65 + 65 // 65 bytes for public key, 65 for signature
)

type EIP712 struct {
	Signer    []byte `json:"signer"`
	Signature []byte `json:"signature"`

	addr codec.Address
}

func (d *EIP712) address() codec.Address {
	if d.addr == codec.EmptyAddress {
		d.addr = NewEIP712Address(d.Signer)
	}
	return d.addr
}

func (*EIP712) GetTypeID() uint8 {
	return consts.EIP712ID
}

func (*EIP712) ComputeUnits(chain.Rules) uint64 {
	return EIP712ComputeUnits
}

func (*EIP712) ValidRange(chain.Rules) (int64, int64) {
	return -1, -1
}

func (d *EIP712) Verify(_ context.Context, tx *chain.Transaction) error {
	msg, err := tx.Digest()
	if err != nil {
		return fmt.Errorf("failed to get digest: %w", err)
	}

	fullMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(msg), msg)
	hash := ethCrypto.Keccak256Hash([]byte(fullMessage))

	// Transform V from 27/28 to 0/1
	signature := make([]byte, len(d.Signature))
	copy(signature, d.Signature)
	signature[ethCrypto.RecoveryIDOffset] -= 27

	sigPublicKey, err := ethCrypto.Ecrecover(hash.Bytes(), signature)
	if err != nil {
		return fmt.Errorf("failed to recover public key: %v", err)
	}

	if !ethCrypto.VerifySignature(sigPublicKey, hash.Bytes(), signature[:len(signature)-1]) {
		return crypto.ErrInvalidSignature
	}

	return nil
}

func (d *EIP712) Actor() codec.Address {
	return d.address()
}

func (d *EIP712) Sponsor() codec.Address {
	return d.address()
}

func (*EIP712) Size() int {
	return EIP712Size
}

func (d *EIP712) Marshal(p *codec.Packer) {
	p.PackFixedBytes(d.Signer)
	p.PackFixedBytes(d.Signature)
}

func UnmarshalEIP712(p *codec.Packer) (chain.Auth, error) {
	var d EIP712
	d.Signer = make([]byte, 65)
	p.UnpackFixedBytes(65, &d.Signer)
	d.Signature = make([]byte, 65)
	p.UnpackFixedBytes(65, &d.Signature)
	return &d, p.Err()
}

var _ chain.AuthFactory = (*EIP712Factory)(nil)

type EIP712Factory struct {
	priv *ecdsa.PrivateKey
}

func NewEIP712Factory(priv *ecdsa.PrivateKey) *EIP712Factory {
	return &EIP712Factory{priv}
}

func (d *EIP712Factory) Sign(tx *chain.Transaction) (chain.Auth, error) {
	if len(tx.Actions) != 1 {
		return nil, fmt.Errorf("only one action is allowed with EIP712 auth")
	}

	action := tx.Actions[0]

	types := map[string][]eip712.Type{
		"EIP712Domain": {
			{Name: "name", Type: "string"},
			{Name: "version", Type: "string"},
			{Name: "chainId", Type: "uint256"},
			{Name: "verifyingContract", Type: "address"},
		},
		"Transaction": {
			{Name: "expiration", Type: "string"},
			{Name: "maxFee", Type: "string"},
			{Name: "action", Type: "string"},
			{Name: "params", Type: "Params"},
		},
		"Params": generateTypeArrayFromStruct(action),
	}

	domain := eip712.TypedDataDomain{
		Name:              "HyperSDK",
		Version:           "1",
		ChainId:           (*math.HexOrDecimal256)(bytes32ToBigInt(tx.Base.ChainID)),
		VerifyingContract: "0x",
		Salt:              "",
	}

	actionName := reflect.TypeOf(action).Name()

	typedData := eip712.TypedData{
		Types:       types,
		PrimaryType: "Mail",
		Domain:      domain,
		Message: map[string]interface{}{
			"expiration": timestampToIsoString(tx.Base.Timestamp),
			"maxFee":     fmt.Sprintf("%d", tx.Base.MaxFee),
			"action":     actionName,
			"params":     map[string]interface{}{}, //will be filled later
		},
	}

	paramsJSON, err := json.Marshal(action)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal action to JSON: %w", err)
	}

	var paramsMap map[string]interface{}
	err = json.Unmarshal(paramsJSON, &paramsMap)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON to map: %w", err)
	}

	typedData.Message["params"] = paramsMap

	hash, _, err := eip712.TypedDataAndHash(typedData)
	if err != nil {
		return nil, fmt.Errorf("failed to hash typed data: %v", err)
	}

	signature, err := eip712.SignHashEth(d.priv, hash)
	if err != nil {
		return nil, fmt.Errorf("failed to sign message: %v", err)
	}

	return &EIP712{Signer: ethCrypto.FromECDSAPub(&d.priv.PublicKey), Signature: signature}, nil
}

func (*EIP712Factory) MaxUnits() (uint64, uint64) {
	return EIP712Size, EIP712ComputeUnits
}

func NewEIP712Address(publicKey []byte) codec.Address {
	return codec.CreateAddress(consts.EIP712ID, utils.ToID(publicKey))
}

func bytes32ToBigInt(bytes32 [32]byte) *big.Int {
	return new(big.Int).SetBytes(bytes32[:])
}

func timestampToIsoString(timestamp int64) string {
	return time.Unix(timestamp, 0).Format(time.RFC3339)
}

func generateTypeArrayFromStruct(v interface{}) []eip712.Type {
	val := reflect.ValueOf(v)
	typ := reflect.TypeOf(v)

	var result []eip712.Type
	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		fieldName := field.Tag.Get("json")

		fieldType := "string" //FIXME: infer from field.Type.Name()

		result = append(result, eip712.Type{
			Name: fieldName,
			Type: fieldType,
		})
	}
	return result
}
