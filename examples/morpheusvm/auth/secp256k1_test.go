// Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package auth

import (
	"context"
	"encoding/hex"
	"testing"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/hypersdk/chain"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/actions"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
)

func TestSecp256k1(t *testing.T) {
	actionRegistry := codec.NewTypeParser[chain.Action]()
	authRegistry := codec.NewTypeParser[chain.Auth]()
	actionRegistry.Register((&actions.Transfer{}).GetTypeID(), actions.UnmarshalTransfer, false)
	authRegistry.Register((&SECP256K1{}).GetTypeID(), UnmarshalSECP256K1, false)

	privateKey, err := crypto.HexToECDSA("fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19")
	require.NoError(t, err)

	authFactory := NewSECP256K1Factory(privateKey)

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

	signedAuthSECP256K1, ok := signedTx.Auth.(*SECP256K1)
	require.True(t, ok)

	require.Equal(t,
		"3b829e1d632596ff64468119f04864bc0d4bdfacce7654a7b8a3d189ed11fe1b055916ceb12b5cd6b4d8bce960040ad4218ef741788fd68a2ba9ecc29d70ec161b",
		hex.EncodeToString(signedAuthSECP256K1.Signature),
	)

	err = signedAuthSECP256K1.Verify(context.TODO(), signedTx)
	require.NoError(t, err)

	require.Equal(t,
		"0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400010000c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e0003049a7df67f79246283fdc93af76d4f8cdd62c4886e8cd870944e817dd0b97934fdd7719d0810951e03418205868a5c1b40b192451367f28e0088dd75e15de40c053b829e1d632596ff64468119f04864bc0d4bdfacce7654a7b8a3d189ed11fe1b055916ceb12b5cd6b4d8bce960040ad4218ef741788fd68a2ba9ecc29d70ec161b",
		hex.EncodeToString(signedTx.Bytes()),
	)
}
