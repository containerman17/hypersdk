package eip712

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/ethereum/go-ethereum/common"
)

func EIP712AddrToETHAddr(addr codec.Address) (string, error) {
	// Check if the first byte is the correct ID
	if addr[0] != consts.EIP712ID {
		return "", fmt.Errorf("invalid EIP712address: incorrect ID")
	}

	// Check if the bytes between 1 and last 20 are zeros
	for i := 1; i < codec.AddressLen-20; i++ {
		if addr[i] != 0 {
			return "", fmt.Errorf("invalid EIP712 address: non-zero bytes in padding")
		}
	}

	// Extract the last 20 bytes
	ethAddrBytes := addr[codec.AddressLen-20:]

	// Convert to hex string with "0x" prefix
	ethAddr := common.BytesToAddress(ethAddrBytes)

	return ethAddr.Hex(), nil
}

func ETHAddrToEIP712Addr(addr string) (codec.Address, error) {
	// Remove "0x" prefix if present
	addr = strings.TrimPrefix(addr, "0x")

	// Decode the hex string
	ethAddr, err := hex.DecodeString(addr)
	if err != nil {
		return codec.Address{}, fmt.Errorf("invalid ETH address: %w", err)
	}

	// Check if the address is 20 bytes long
	if len(ethAddr) != 20 {
		return codec.Address{}, fmt.Errorf("invalid ETH address length: expected 20 bytes, got %d", len(ethAddr))
	}

	// Create a new codec.Address
	var eip712Addr codec.Address

	// Set the first byte to EIP712ID
	eip712Addr[0] = consts.EIP712ID

	// Copy the ETH address to the last 20 bytes of the EIP712 address
	copy(eip712Addr[codec.AddressLen-20:], ethAddr)

	return eip712Addr, nil
}
