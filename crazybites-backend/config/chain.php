<?php

return [
    'enabled'            => env('CHAIN_ENABLED', false),
    'rpc_url'            => env('CHAIN_RPC_URL'),
    'vault_address'      => strtolower(env('CHAIN_VAULT_ADDRESS', '')),
    'usdt_address'       => strtolower(env('CHAIN_USDT_ADDRESS', '')),
    'company_wallet_address' => strtolower(env('CHAIN_COMPANY_WALLET_ADDRESS', '')),
    'start_block'        => (int) env('CHAIN_START_BLOCK', 0),
    'confirmations'      => (int) env('CHAIN_CONFIRMATIONS', 5),
    'chunk'              => (int) env('CHAIN_CHUNK', 500),          // how much block in one time
    'max_chunks_per_run' => (int) env('CHAIN_MAX_CHUNKS', 5),       //maximum chunks n one command run
    'decimals'           => 18,
];