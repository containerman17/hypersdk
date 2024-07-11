// Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

package actions

import (
	"encoding/json"
	"testing"

	"github.com/ava-labs/hypersdk/codec"
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
