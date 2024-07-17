package auth

import (
	"context"
	"encoding/hex"
	"math/big"
	"testing"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/actions"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/eip712"
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

	toAddr, err := codec.ParseAddressBech32(consts.HRP, "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu")
	require.NoError(t, err)

	chainId, err := ids.FromString("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")
	require.NoError(t, err)

	tx := &chain.Transaction{
		Base: &chain.Base{Timestamp: 1717111222000, ChainID: chainId, MaxFee: 10 * 1_000_000_000},
		Actions: []chain.Action{&actions.Transfer{
			To:    toAddr,
			Value: 123 * 1_000_000_000,
		}},
		Auth: nil,
	}

	originalDigest, err := tx.Digest()
	require.NoError(t, err)

	require.Equal(t,
		"0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00",
		hex.EncodeToString(originalDigest),
	)

	signedTx, err := tx.Sign(authFactory, actionRegistry, authRegistry)
	require.NoError(t, err)

	signedAuthEIP712, ok := signedTx.Auth.(*EIP712)
	require.True(t, ok)

	require.Equal(t,
		"c91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c",
		hex.EncodeToString(signedAuthEIP712.Signature),
	)

	err = signedAuthEIP712.Verify(context.TODO(), signedTx)
	require.NoError(t, err)

	require.Equal(t,
		"0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004039a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdc91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c",
		hex.EncodeToString(signedTx.Bytes()),
	)

	signer := signedAuthEIP712.address()
	ethAddr, err := eip712.EIP712AddrToETHAddr(signer)
	require.NoError(t, err)
	require.Equal(t, "0x96216849c49358B10257cb55b28eA603c874b05E", ethAddr)
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

	require.Equal(t, "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0004039a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdc91e809201fdada92235637d3a570a4dac980a44322ee0b9b5e14b11c4cdc9cf064bc3e0f9f73dd7ec1051f50fc9298148151a7d99bf99ad88d3c4abab7e7dc41c", hex.EncodeToString(p.Bytes()))
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
