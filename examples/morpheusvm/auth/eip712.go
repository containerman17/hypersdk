// Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package auth

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"reflect"
	"time"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/crypto"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	mconsts "github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/eip712"
	"github.com/ava-labs/hypersdk/utils"
	"github.com/ethereum/go-ethereum/common/math"
	ethCrypto "github.com/ethereum/go-ethereum/crypto"
	"golang.org/x/crypto/sha3"
)

var _ chain.Auth = (*EIP712)(nil)

const (
	EIP712ComputeUnits = 10      // can't be batched like ed25519
	EIP712Size         = 33 + 65 // 33 bytes for public key, 65 for signature
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
	hash, err := eip712hashTx(tx)
	if err != nil {
		return err
	}
	signature := make([]byte, len(d.Signature))
	copy(signature, d.Signature)

	// Transform V from 27/28 to 0/1
	signature[ethCrypto.RecoveryIDOffset] -= 27

	//FIXME: why do we cut off the last byte?
	if !ethCrypto.VerifySignature(d.Signer, hash, signature[:64]) {
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
	d.Signer = make([]byte, 33)
	p.UnpackFixedBytes(33, &d.Signer)
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

func eip712hashTx(tx *chain.Transaction) ([]byte, error) {
	typedData, err := getTypedData(tx)
	if err != nil {
		return nil, err
	}

	hash, _, err := eip712.TypedDataAndHash(*typedData)
	if err != nil {
		return nil, fmt.Errorf("failed to hash typed data: %v", err)
	}

	return hash, nil
}

const METAMASK_MAX_SAFE_CHAIN_ID = 4503599627370476

func getTypedData(tx *chain.Transaction) (*eip712.TypedData, error) {
	if len(tx.Actions) != 1 {
		return nil, fmt.Errorf("only one action is allowed with EIP712 auth")
	}

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
		"Params": generateTypeArrayFromStruct(tx.Actions[0]),
	}

	chainId := bytes32ToBigInt(tx.Base.ChainID)
	safeChainId := chainId.Mod(chainId, big.NewInt(METAMASK_MAX_SAFE_CHAIN_ID))

	domain := eip712.TypedDataDomain{
		Name:              "HyperSDK",
		Version:           "1",
		ChainId:           (*math.HexOrDecimal256)(safeChainId),
		VerifyingContract: "0x0000000000000000000000000000000000000000",
		Salt:              "",
	}

	actionName := reflect.TypeOf(tx.Actions[0]).Elem().Name()

	typedData := eip712.TypedData{
		Types:       types,
		PrimaryType: "Transaction",
		Domain:      domain,
		Message: map[string]interface{}{
			"expiration": timestampToIsoString(tx.Base.Timestamp / 1000),
			"maxFee":     utils.FormatBalance(tx.Base.MaxFee, mconsts.Decimals),
			"action":     actionName,
			"params":     map[string]interface{}{}, //will be filled later
		},
	}

	paramsJSON, err := json.Marshal(tx.Actions[0])
	if err != nil {
		return nil, fmt.Errorf("failed to marshal action to JSON: %w", err)
	}

	var paramsMap map[string]interface{}
	err = json.Unmarshal(paramsJSON, &paramsMap)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON to map: %w", err)
	}

	typedData.Message["params"] = paramsMap

	return &typedData, nil
}

func (d *EIP712Factory) Sign(tx *chain.Transaction) (chain.Auth, error) {
	hash, err := eip712hashTx(tx)
	if err != nil {
		return nil, err
	}

	signature, err := eip712.SignHashEth(d.priv, hash)
	if err != nil {
		return nil, fmt.Errorf("failed to sign message: %v", err)
	}

	signerBytes := ethCrypto.CompressPubkey(&d.priv.PublicKey)

	if len(signerBytes) != 33 {
		return nil, errors.New("signer is not 33 bytes long")
	}

	return &EIP712{Signer: signerBytes[:], Signature: signature}, nil
}

func (*EIP712Factory) MaxUnits() (uint64, uint64) {
	return EIP712Size, EIP712ComputeUnits
}

func NewEIP712Address(publicKey []byte) codec.Address {
	addrBytes := ETHPublicKeyBytesToAddressBytes(publicKey)
	paddedAddrBytes := make([]byte, 32)
	copy(paddedAddrBytes[12:], addrBytes) // Pad with 12 leading zeros
	return codec.CreateAddress(consts.EIP712ID, ids.ID(paddedAddrBytes))
}

func ETHPublicKeyBytesToAddressBytes(compressedPubKey []byte) []byte {
	pubKey, err := ethCrypto.DecompressPubkey(compressedPubKey)
	if err != nil {
		panic(fmt.Sprintf("failed to decompress public key: %v", err))
	}

	var buf []byte

	hash := sha3.NewLegacyKeccak256()
	hash.Write(pubKey.X.Bytes())
	hash.Write(pubKey.Y.Bytes())
	buf = hash.Sum(nil)
	address := buf[12:]

	return address
}

func bytes32ToBigInt(bytes32 [32]byte) *big.Int {
	return new(big.Int).SetBytes(bytes32[:])
}

func timestampToIsoString(timestamp int64) string {
	return time.Unix(timestamp, 0).Format(time.RFC3339)
}
func generateTypeArrayFromStruct(v interface{}) []eip712.Type {
	val := reflect.Indirect(reflect.ValueOf(v))
	typ := val.Type()

	if typ.Kind() != reflect.Struct {
		panic("generateTypeArrayFromStruct expects a struct")
	}

	var result []eip712.Type
	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		fieldName := field.Tag.Get("json")
		if fieldName == "" {
			fieldName = field.Name
		}

		fieldType := "string" // field.Type.Kind().String()

		result = append(result, eip712.Type{
			Name: fieldName,
			Type: fieldType,
		})
	}
	return result
}
