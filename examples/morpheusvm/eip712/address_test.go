package eip712_test

import (
	"strings"
	"testing"

	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/eip712"
	"github.com/stretchr/testify/require"
)

func TestEIP712AddrToETHAddr(t *testing.T) {
	tests := []struct {
		name        string
		input       codec.Address
		expected    string
		expectError bool
	}{
		{
			name: "Valid EIP712 address",
			input: func() codec.Address {
				var addr codec.Address
				addr[0] = consts.EIP712ID
				copy(addr[codec.AddressLen-20:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20})
				return addr
			}(),
			expected:    "0x0102030405060708090a0b0c0d0e0f1011121314",
			expectError: false,
		},
		{
			name: "Invalid EIP712 address with incorrect ID",
			input: func() codec.Address {
				var addr codec.Address
				addr[0] = 0x00
				return addr
			}(),
			expected:    "",
			expectError: true,
		},
		{
			name: "Invalid EIP712 address with non-zero byte where zero expected",
			input: func() codec.Address {
				var addr codec.Address
				addr[0] = consts.EIP712ID
				addr[1] = 0x01
				return addr
			}(),
			expected:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := require.New(t)
			result, err := eip712.EIP712AddrToETHAddr(tt.input)
			if tt.expectError {
				r.Error(err)
			} else {
				r.NoError(err)
				r.Equal(strings.ToLower(tt.expected), strings.ToLower(result))
			}
		})
	}
}

func TestETHAddrToEIP712Addr(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expected    codec.Address
		expectError bool
	}{
		{
			name:  "Valid ETH address",
			input: "0x0102030405060708090a0b0c0d0e0f1011121314",
			expected: func() codec.Address {
				var addr codec.Address
				addr[0] = consts.EIP712ID
				copy(addr[codec.AddressLen-20:], []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20})
				return addr
			}(),
			expectError: false,
		},
		{
			name:        "Invalid ETH address with incorrect length",
			input:       "0x01020304",
			expected:    codec.Address{},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := require.New(t)
			result, err := eip712.ETHAddrToEIP712Addr(tt.input)
			if tt.expectError {
				r.Error(err)
			} else {
				r.NoError(err)
				r.Equal(tt.expected, result)
			}
		})
	}
}

func TestETHAddrSpec(t *testing.T) {
	ethAddr := "0x96216849c49358B10257cb55b28eA603c874b05E"
	eip712Addr, err := eip712.ETHAddrToEIP712Addr(ethAddr)
	require.NoError(t, err)

	eip712AddrStr := codec.MustAddressBech32(consts.HRP, eip712Addr)
	require.Equal(t, "morpheus1qsqqqqqqqqqqqqqqqqqqp93pdpyufy6ckyp90j64k282vq7gwjc9u7lsetm", eip712AddrStr)

	ethAddrReversed, err := eip712.EIP712AddrToETHAddr(eip712Addr)
	require.NoError(t, err)
	require.Equal(t, ethAddr, ethAddrReversed)
}
