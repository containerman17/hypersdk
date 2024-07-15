package auth

import (
	"encoding/hex"
	"math/big"
	"testing"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/actions"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
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

	err = signedAuthEIP712.Verify(nil, signedTx)
	require.NoError(t, err)
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

func TestEip712FullTx(t *testing.T) {
	actionRegistry := codec.NewTypeParser[chain.Action]()
	authRegistry := codec.NewTypeParser[chain.Auth]()
	actionRegistry.Register((&actions.Transfer{}).GetTypeID(), actions.UnmarshalTransfer, false)
	authRegistry.Register((&EIP712{}).GetTypeID(), UnmarshalEIP712, false)

	privateKey, err := crypto.HexToECDSA("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
	require.NoError(t, err)

	toAddr, err := codec.ParseAddressBech32(consts.HRP, "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu")
	require.NoError(t, err)

	authFactory := NewEIP712Factory(privateKey)

	chainID, err := ids.FromString("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")
	require.NoError(t, err)

	tx := &chain.Transaction{
		Base: &chain.Base{Timestamp: 1717111222000, ChainID: chainID, MaxFee: 10 * 1_000_000_000},
		Actions: []chain.Action{&actions.Transfer{
			To:    toAddr,
			Value: 123 * 1_000_000_000,
		}},
		Auth: nil,
	}

	signedTx, err := tx.Sign(authFactory, actionRegistry, authRegistry)
	require.NoError(t, err)

	p := codec.NewWriter(0, 1000000)

	signedTx.Marshal(p)

	digest, err := signedTx.Digest()
	require.NoError(t, err)

	require.Equal(t, "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00", hex.EncodeToString(digest))

	require.Equal(t, "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004049a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdd7719d0810951e03418205868a5c1b40b192451367f28e0088dd75e15de40c05d67f92c8889a190991db0f0830cb19efeb12e058a7d099a15384eafcd9859b054fda4ce67cb49f8ec27635dd2f00050ec0c09ada185a32d0ff914e3ed930e2d41c", hex.EncodeToString(p.Bytes()))
}

func TestEip712EmptyTxDigest(t *testing.T) {
	actionRegistry := codec.NewTypeParser[chain.Action]()
	authRegistry := codec.NewTypeParser[chain.Auth]()
	actionRegistry.Register((&actions.Transfer{}).GetTypeID(), actions.UnmarshalTransfer, false)
	authRegistry.Register((&EIP712{}).GetTypeID(), UnmarshalEIP712, false)

	chainID, err := ids.FromString("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")
	require.NoError(t, err)

	tx := &chain.Transaction{
		Base:    &chain.Base{Timestamp: 1717111222000, ChainID: chainID, MaxFee: 10 * 1_000_000_000},
		Actions: []chain.Action{},
		Auth:    nil,
	}

	digest, err := tx.Digest()
	require.NoError(t, err)

	require.Equal(t, "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be40000", hex.EncodeToString(digest))
}
