// Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package actions

import (
	"encoding/hex"
	"encoding/json"
	"testing"

	"github.com/ava-labs/hypersdk/codec"
	"github.com/ava-labs/hypersdk/examples/morpheusvm/consts"
	"github.com/stretchr/testify/require"
)

func TestTransferJson(t *testing.T) {
	transfer := Transfer{
		To:    codec.Address{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16},
		Value: 123 * 1_000_000_000, // Corrected value to match the expected JSON
	}

	expected := `{"to":"morpheus1qypqxpq9qcrsszg2pvxq6rs0zqqqqqqqqqqqqqqqqqqqqqqqqqqqql22w7h","value":"123.000000000"}`
	actual, err := json.Marshal(transfer)
	require.NoError(t, err)
	require.EqualValues(t, expected, string(actual))
}

func TestPacking(t *testing.T) {

	toAddr, err := codec.ParseAddressBech32(consts.HRP, "morpheus1qrzvk4zlwj9zsacqgtufx7zvapd3quufqpxk5rsdd4633m4wz2fdjk97rwu")
	require.NoError(t, err)

	action := &Transfer{
		To:    toAddr,
		Value: 123 * 1_000_000_000,
	}

	p := codec.NewWriter(0, 1000000)

	action.Marshal(p)

	require.Equal(t, "00c4cb545f748a28770042f893784ce85b107389004d6a0e0d6d7518eeae1292d90000001ca35f0e00", hex.EncodeToString(p.Bytes()))
}
