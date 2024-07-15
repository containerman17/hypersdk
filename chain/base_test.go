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
	chainId, err := ids.FromString("2c7iUW3kCDwRA9ZFd5bjZZc8iDy68uAsFSBahjqSZGttiTDSNH")
	require.NoError(t, err)

	base := &Base{Timestamp: 1717111222000, ChainID: chainId, MaxFee: uint64(10 * math.Pow(10, 9))}

	packer := codec.NewWriter(0, 1000000)
	base.Marshal(packer)

	require.Equal(t, "0000018fcbcdeef0d36e467c73e2840140cc41b3d72f8a5a7446b2399c39b9c74d4cf077d250902400000002540be400", hex.EncodeToString(packer.Bytes()))
}
