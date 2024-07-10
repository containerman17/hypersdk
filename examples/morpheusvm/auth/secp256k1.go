// Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package auth

import (
	"context"
	"crypto/ecdsa"
	"fmt"

	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/crypto"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ava-labs/hypersdk/utils"
	ethCrypto "github.com/ethereum/go-ethereum/crypto"
)

var _ chain.Auth = (*SECP256K1)(nil)

const (
	SECP256K1ComputeUnits = 10      // can't be batched like ed25519
	SECP256K1Size         = 65 + 65 // 65 bytes for public key, 65 for signature
)

type SECP256K1 struct {
	Signer    []byte `json:"signer"`
	Signature []byte `json:"signature"`

	addr codec.Address
}

func (d *SECP256K1) address() codec.Address {
	if d.addr == codec.EmptyAddress {
		d.addr = NewSECP256K1Address(d.Signer)
	}
	return d.addr
}

func (*SECP256K1) GetTypeID() uint8 {
	return consts.SECP256K1ID
}

func (*SECP256K1) ComputeUnits(chain.Rules) uint64 {
	return SECP256K1ComputeUnits
}

func (*SECP256K1) ValidRange(chain.Rules) (int64, int64) {
	return -1, -1
}

func (d *SECP256K1) Verify(_ context.Context, msg []byte) error {
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

	fmt.Printf(".SECP256K1.Verify sigPublicKey: %v\n", sigPublicKey)

	return nil
}

func (d *SECP256K1) Actor() codec.Address {
	return d.address()
}

func (d *SECP256K1) Sponsor() codec.Address {
	return d.address()
}

func (*SECP256K1) Size() int {
	return SECP256K1Size
}

func (d *SECP256K1) Marshal(p *codec.Packer) {
	p.PackFixedBytes(d.Signer)
	p.PackFixedBytes(d.Signature)
}

func UnmarshalSECP256K1(p *codec.Packer) (chain.Auth, error) {
	var d SECP256K1
	d.Signer = make([]byte, 65)
	p.UnpackFixedBytes(65, &d.Signer)
	d.Signature = make([]byte, 65)
	p.UnpackFixedBytes(65, &d.Signature)
	return &d, p.Err()
}

var _ chain.AuthFactory = (*SECP256K1Factory)(nil)

type SECP256K1Factory struct {
	priv *ecdsa.PrivateKey
}

func NewSECP256K1Factory(priv *ecdsa.PrivateKey) *SECP256K1Factory {
	return &SECP256K1Factory{priv}
}

func (d *SECP256K1Factory) Sign(msg []byte) (chain.Auth, error) {
	fullMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(msg), msg)
	hash := ethCrypto.Keccak256Hash([]byte(fullMessage))
	signature, err := ethCrypto.Sign(hash.Bytes(), d.priv)
	if err != nil {
		return nil, fmt.Errorf("failed to sign message: %v", err)
	}

	// Transform V from 0/1 to 27/28 according to the yellow paper
	signature[ethCrypto.RecoveryIDOffset] += 27

	return &SECP256K1{Signer: ethCrypto.FromECDSAPub(&d.priv.PublicKey), Signature: signature}, nil
}

func (*SECP256K1Factory) MaxUnits() (uint64, uint64) {
	return SECP256K1Size, SECP256K1ComputeUnits
}

func NewSECP256K1Address(publicKey []byte) codec.Address {
	return codec.CreateAddress(consts.SECP256K1ID, utils.ToID(publicKey))
}
