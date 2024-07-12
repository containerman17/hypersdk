package chain

import (
	"encoding/hex"
	"math"
	"testing"

	"github.com/ava-labs/avalanchego/ids"
	"github.com/ava-labs/hypersdk/codec"
	"github.com/stretchr/testify/require"
)

func TestBase(t *testing.T) {
	chainId, err := ids.FromString("kF3cvAzriLGjFjCTzVPeJcQqoW8kMYX1PLisuZdQ5R4URPxE2")
	require.NoError(t, err)

	base := &Base{Timestamp: 1717111222000, ChainID: chainId, MaxFee: uint64(10 * math.Pow(10, 9))}

	packer := codec.NewWriter(0, 1000000)
	base.Marshal(packer)

	require.Equal(t, "0000018fcbcdeef0622fc5a40deee96bfb1f1ccfc7ac73668d7598aa9df3796fd6681dbb21bb465a00000002540be400", hex.EncodeToString(packer.Bytes()))
}
