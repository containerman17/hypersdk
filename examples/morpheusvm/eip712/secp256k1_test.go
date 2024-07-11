package eip712

import (
	"encoding/hex"
	"fmt"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/crypto"
)

func TestEthSigs(t *testing.T) {
	privateKey, err := crypto.HexToECDSA("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
	if err != nil {
		t.Fatalf("Failed to parse private key: %v", err)
	}

	data := []byte("Example `personal_sign` message")

	// Sign the data
	signature, err := SignMessageEth(privateKey, data)
	if err != nil {
		t.Fatalf("Failed to sign message: %v", err)
	}

	if len(signature) != crypto.SignatureLength {
		t.Fatalf("Signature length mismatch. Got %d, want %d", len(signature), crypto.SignatureLength)
	}

	expectedSig := "0x116355582f0299da2cfc8bda519fdf9fba163c1c6612675c1d6695c7dd0a60f73f9df90f63de59edbca0ea4105fc862f20a3c7ca7d29395eef8d51a43875618f1c"
	// Convert signature to hex string for comparison
	sigHex := "0x" + hex.EncodeToString(signature)

	if !strings.EqualFold(sigHex, expectedSig) {
		t.Errorf("Signature mismatch. Got %s, want %s", sigHex, expectedSig)
	}

	// Recover address
	fullMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(data), data)
	hash := crypto.Keccak256Hash([]byte(fullMessage))
	recoveredAddress, err := RecoverAddressEth(hash, signature)
	if err != nil {
		t.Fatalf("Failed to recover address: %v", err)
	}

	// Compare with expected values
	expectedRecoveredAddress := "0x96216849c49358b10257cb55b28ea603c874b05e"

	if !strings.EqualFold(recoveredAddress.Hex(), expectedRecoveredAddress) {
		t.Errorf("Recovered address mismatch. Got %s, want %s", recoveredAddress.Hex(), expectedRecoveredAddress)
	}

	// Verify the signature
	signatureNoRecoverID := signature[:len(signature)-1] // remove recovery id
	sigPublicKey, err := crypto.Ecrecover(hash.Bytes(), signature)
	if err != nil {
		t.Fatalf("Failed to recover public key: %v", err)
	}
	verified := crypto.VerifySignature(sigPublicKey, hash.Bytes(), signatureNoRecoverID)
	if !verified {
		t.Errorf("Failed to verify signature")
	}
}
