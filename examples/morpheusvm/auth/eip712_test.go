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
	actionRegistry := codec.NewTypeParser[chain.Action]()
	authRegistry := codec.NewTypeParser[chain.Auth]()
	actionRegistry.Register((&actions.Transfer{}).GetTypeID(), actions.UnmarshalTransfer, false)
	authRegistry.Register((&EIP712{}).GetTypeID(), UnmarshalEIP712, false)

	privateKey, err := crypto.HexToECDSA("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
	require.NoError(t, err)

	authFactory := NewEIP712Factory(privateKey)

	tx := &chain.Transaction{
		Base: &chain.Base{Timestamp: 1717111222000, ChainID: ids.ID(bigIntToBytes(big.NewInt(123456789))), MaxFee: 10 * 1_000_000_000},
		Actions: []chain.Action{&actions.Transfer{
			To:    codec.Address{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16},
			Value: 123 * 1_000_000_000,
		}},
		Auth: nil,
	}

	signedTx, err := tx.Sign(authFactory, actionRegistry, authRegistry)
	require.NoError(t, err)

	signedAuthEIP712, ok := signedTx.Auth.(*EIP712)
	require.True(t, ok)

	expectedSig := "0xd72250dd84c68a111707e237b166f8d2f847d6c3d49bece4d2ca56c7688628ad5f200d0a75cd9a68d09abb8a40eb7df1c4992f65d7cdd5a1e79dacc1baa7171a1b"
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
