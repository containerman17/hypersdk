package auth

import (
	"math/big"
	"testing"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/actions"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/eip712"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
)

func TestGenerateTypeArrayFromStruct(t *testing.T) {
	type Transfer struct {
		To    codec.Address `json:"to"`
		Value uint64        `json:"value"`
	}

	require.Equal(t, []eip712.Type{
		{Type: "string", Name: "to"},
		{Type: "string", Name: "value"},
	}, generateTypeArrayFromStruct(Transfer{}))
}

func TestEip712(t *testing.T) {
	privateKey, err := crypto.HexToECDSA("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
	require.NoError(t, err)

	authFactory := NewEIP712Factory(privateKey)

	tx := &chain.Transaction{
		Base: &chain.Base{Timestamp: 1717111222333, ChainID: ids.ID(bigIntToBytes(big.NewInt(123456789))), MaxFee: 10 * 1_000_000_000},
		Actions: []chain.Action{&actions.Transfer{
			To:    codec.Address{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16},
			Value: 123 * 1_000_000_000,
		}},
		Auth: nil,
	}

	signedAuth, err := authFactory.Sign(tx)
	require.NoError(t, err)

	signedAuthEIP712, ok := signedAuth.(*EIP712)
	require.True(t, ok)

	expectedSig := "0x40c51a6bab4c4e96763df1382dbef477e424fd1857268ee4409af5a01efbd17407908de21e8e4c6d4bb9ae35f0c9e08b660ccf30587c009f2d659546fca0942a1b"
	require.Equal(t, expectedSig, hexutil.Encode(signedAuthEIP712.Signature))
}

// Convert [32]byte to big.Int
func bytesToBigInt(b [32]byte) *big.Int {
	return new(big.Int).SetBytes(b[:])
}

// Convert big.Int to [32]byte
func bigIntToBytes(n *big.Int) [32]byte {
	var b [32]byte
	bytes := n.Bytes()
	copy(b[32-len(bytes):], bytes) // Copy bytes from the right
	return b
}
