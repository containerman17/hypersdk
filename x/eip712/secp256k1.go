package eip712

import (
	"crypto/ecdsa"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func SignMessageEth(privateKey *ecdsa.PrivateKey, data []byte) ([]byte, error) {
	fullMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(data), data)
	hash := crypto.Keccak256Hash([]byte(fullMessage))
	return SignHashEth(privateKey, hash)
}

func SignHashEth(privateKey *ecdsa.PrivateKey, hash common.Hash) ([]byte, error) {
	signature, err := crypto.Sign(hash.Bytes(), privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign hash: %v", err)
	}

	// Transform V from 0/1 to 27/28 according to the yellow paper
	signature[crypto.RecoveryIDOffset] += 27

	return signature, nil
}

func RecoverAddressEth(hash common.Hash, signature []byte) (common.Address, error) {
	// Transform V from 27/28 to 0/1
	signature[crypto.RecoveryIDOffset] -= 27

	sigPublicKey, err := crypto.Ecrecover(hash.Bytes(), signature)
	if err != nil {
		return common.Address{}, fmt.Errorf("failed to recover public key: %v", err)
	}

	pubKey, err := crypto.UnmarshalPubkey(sigPublicKey)
	if err != nil {
		return common.Address{}, fmt.Errorf("failed to unmarshal public key: %v", err)
	}

	return crypto.PubkeyToAddress(*pubKey), nil
}
