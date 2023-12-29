'use client'

import React, { useState } from 'react'
import { WagmiConfig, createConfig } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { goerli } from 'viem/chains'
import Minting from './minting'

const config = createConfig({
  autoConnect: false,
  publicClient: createPublicClient({
    chain: goerli,
    transport: http()
  }),
})

export default function Home() {
  return (
    <WagmiConfig config={config}>
      <Minting />
    </WagmiConfig>
  )
}
