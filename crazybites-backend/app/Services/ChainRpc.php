<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChainRpc
{
    public function call(string $method, array $params = [])
    {
        $payload = ['jsonrpc' => '2.0', 'id' => 1, 'method' => $method, 'params' => $params];
        $last = null;

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $response = Http::timeout(20)->post(config('chain.rpc_url'), $payload);
            $res = $response->json();

            $rateLimited = $response->status() === 429 || ($res['error']['code'] ?? null) === -32005;

            if ($response->serverError() || $rateLimited) {
                $last = $res['error']['message'] ?? ('HTTP ' . $response->status());
                Log::warning('BSC RPC busy, retrying', ['method' => $method, 'attempt' => $attempt, 'error' => $last]);
                usleep($attempt * 700000);
                continue;
            }

            if (isset($res['error'])) {
                Log::error('BSC RPC JSON error', ['method' => $method, 'error' => $res['error']]);
                throw new \RuntimeException($res['error']['message'] ?? 'RPC error');
            }

            return $res['result'] ?? null;
        }

        throw new \RuntimeException('RPC busy: ' . $last);
    }

    public function blockNumber(): int
    {
        return (int) hexdec($this->call('eth_blockNumber'));
    }

    public function getLogs(int $from, int $to, string $address, array $topics): array
    {
        return $this->call('eth_getLogs', [[
            'fromBlock' => '0x' . dechex($from),
            'toBlock'   => '0x' . dechex($to),
            'address'   => $address,
            'topics'    => $topics,
        ]]) ?? [];
    }

    // Tx hasn't been mined yet => null
    public function getTransactionReceipt(string $txHash): ?array
    {
        return $this->call('eth_getTransactionReceipt', [$txHash]);
    }
}