import React, { FC, useEffect, createContext, useCallback, useContext, useMemo } from 'react'
import { createStateContext, useInterval } from 'react-use'
import { providers } from 'ethers'
import type { Provider } from '@ethersproject/providers'

import { composedComponent } from '../utils/reactUtils'
import { FetchState, useFetchState } from '../hooks/useFetchState'
import { LocalStorage } from '../localStorage'
import { MassetName } from '../types'

interface NetworkPrices {
  nativeToken?: number
  gas?: {
    slow: number
    standard: number
    fast: number
    instant: number
  }
}

interface CoreAddresses {
  MTA: string
  vMTA: string
  FeederWrapper: string
  SaveWrapper: string
  UniswapRouter02_Like: string
}

interface MstableGqlEndpoints extends Record<string, string> {
  protocol: string
  feeders: string
}

interface CoreGqlEndpoints extends MstableGqlEndpoints {
  blocks: string
}

export enum ChainIds {
  EthereumMainnet = 1,
  EthereumRopsten = 3,
  EthereumGoerli = 5,
  MaticMainnet = 137,
  MaticMumbai = 80001,
}

export enum Networks {
  Ethereum = 'Ethereum',
  Polygon = 'Polygon',
}

interface Network<TAddresses, TGqlEndpoints> {
  protocolName: string

  chainName: string

  isMetaMaskDefault: boolean

  isTestnet: boolean

  blockTime: number

  nativeToken: {
    decimals: number
    symbol: string
    parentChainAddress?: string
  }

  chainId: ChainIds

  parentChainId?: ChainIds

  coingeckoId: string

  rpcEndpoints: string[]

  gqlEndpoints: CoreGqlEndpoints & TGqlEndpoints

  addresses: CoreAddresses & { ERC20: { wMATIC?: string; WETH?: string } } & TAddresses

  gasStationEndpoint: string

  getExplorerUrl(entity?: string, type?: 'address' | 'transaction' | 'token' | 'account'): string

  supportedMassets: MassetName[]
}

export interface EthereumMainnet
  extends Network<
    {
      Curve: { CurveV2: string }
      ERC20: {
        SUSHI: string
        BADGER: string
        CREAM: string
        renBTC: string
        WETH: string
        WBTC: string
      }
    },
    {
      ecosystem: string
      curve: string
      sushi: string
      balancer: string
      uniswap: string
    }
  > {
  chainId: ChainIds.EthereumMainnet
}

export interface EthereumRopsten extends Network<{ ERC20: { WETH: string } }, {}> {
  chainId: ChainIds.EthereumRopsten
}

export interface EthereumGoerli extends Network<{ ERC20: { WETH: string } }, {}> {
  chainId: ChainIds.EthereumGoerli
}

export interface MaticMainnet extends Network<{ ERC20: { wMATIC: string } }, {}> {
  chainId: ChainIds.MaticMainnet
  parentChainId: ChainIds.EthereumMainnet
  nativeToken: {
    symbol: string
    decimals: number
    parentChainAddress: string
  }
}

export interface MaticMumbai extends Network<{ ERC20: { wMATIC: string } }, {}> {
  chainId: ChainIds.MaticMumbai
  parentChainId: ChainIds.EthereumGoerli
  nativeToken: {
    symbol: string
    decimals: number
    parentChainAddress: string
  }
}

export type AllNetworks = EthereumMainnet | EthereumRopsten | EthereumGoerli | MaticMainnet | MaticMumbai

const etherscanUrl = (network?: string) => (data?: string, type?: 'account' | 'transaction' | 'address' | 'token'): string => {
  const prefix = `https://${network ? `${network}.` : ''}etherscan.io`

  if (!data) return prefix

  switch (type) {
    case 'transaction':
      return `${prefix}/tx/${data}`
    case 'token':
      return `${prefix}/token/${data}`
    case 'address':
    default:
      return `${prefix}/address/${data}`
  }
}

const ETH_MAINNET: EthereumMainnet = {
  chainId: ChainIds.EthereumMainnet,
  protocolName: Networks.Ethereum,
  chainName: 'Mainnet',
  nativeToken: {
    symbol: 'ETH',
    decimals: 18,
  },
  isMetaMaskDefault: true,
  isTestnet: false,
  blockTime: 15e3,
  coingeckoId: 'ethereum',
  rpcEndpoints: ['https://mainnet.infura.io/v3/a6daf77ef0ae4b60af39259e435a40fe'],
  gasStationEndpoint: 'https://www.gasnow.org/api/v3/gas/price?utm_source=:mstable',
  gqlEndpoints: {
    protocol: 'https://api.thegraph.com/subgraphs/name/mstable/mstable-protocol-staging',
    feeders: 'https://api.thegraph.com/subgraphs/name/mstable/mstable-feeder-pools',
    blocks: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
    ecosystem: 'https://api.thegraph.com/subgraphs/name/mstable/mstable-ecosystem',
    curve: 'https://api.thegraph.com/subgraphs/name/protofire/curve',
    sushi: 'https://api.thegraph.com/subgraphs/name/jiro-ono/sushiswap-v1-exchange',
    balancer: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer',
    uniswap: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2',
  },
  addresses: {
    MTA: '0xa3bed4e1c75d00fa6f4e5e6922db7261b5e9acd2',
    vMTA: '0xae8bc96da4f9a9613c323478be181fdb2aa0e1bf',
    FeederWrapper: '0x7C1fD068CE739A4687BEe9F69e5FD2275C7372d4',
    SaveWrapper: '0x0CA7A25181FC991e3cC62BaC511E62973991f325',
    UniswapRouter02_Like: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    Curve: {
      CurveV2: '0x1aef73d49dedc4b1778d0706583995958dc862e6',
    },
    ERC20: {
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      SUSHI: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
      BADGER: '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
      CREAM: '0x2ba592F78dB6436527729929AAf6c908497cB200',
      renBTC: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
    },
  },
  getExplorerUrl: etherscanUrl(),
  supportedMassets: ['mbtc', 'musd'],
}

export const NETWORKS = [ETH_MAINNET]

export const getNetwork = (chainId: ChainIds | 0): Extract<AllNetworks, { chainId: typeof chainId }> => {
  switch (chainId) {
    case 0:
    case ChainIds.EthereumMainnet:
      return ETH_MAINNET

    default:
      throw new Error('Unsupported chain ID')
  }
}

// TODO could still use an env var to define the default chain ID
// Or even domain matching (polygon.*)
const [useChainIdCtx, ChainIdProvider] = createStateContext<ChainIds | undefined>(
  LocalStorage.get('mostRecentChainId') ?? ChainIds.EthereumMainnet,
)
export { useChainIdCtx }

const networkCtx = createContext<Network<unknown, unknown>>(null as never)

const networkPricesCtx = createContext<FetchState<NetworkPrices>>(null as never)

const jsonRpcCtx = createContext<{ provider: Provider; parentChainProvider?: Provider } | undefined>(undefined)

const NetworkConfigProvider: FC = ({ children }) => {
  const [chainId] = useChainIdCtx()

  const network = useMemo(() => getNetwork(chainId ?? ChainIds.EthereumMainnet), [chainId])

  return <networkCtx.Provider value={network}>{children}</networkCtx.Provider>
}

const NetworkPricesProvider: FC = ({ children }) => {
  const network = useContext(networkCtx)

  const [networkPrices, setNetworkPrices] = useFetchState<NetworkPrices>({})

  const fetchPrices = useCallback(async () => {
    if (!network) return

    setNetworkPrices.fetching()
    const gasStationResponse = await fetch(network.gasStationEndpoint)
    const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${network.coingeckoId}&vs_currencies=usd`)

    const [{ data, standard, instant, fast, fastest, safeLow, slow }, priceResult] = (await Promise.all([
      gasStationResponse.json(),
      priceResponse.json(),
    ])) as [
      {
        fast: number
        standard: number
        // Interface differences across endpoints
        fastest?: number
        instant?: number
        safeLow?: number
        slow?: number
        data?: {
          slow: number
          fast: number
          standard: number
          rapid: number
        }
      },
      Record<typeof network['coingeckoId'], { usd: number }>,
    ]

    const gasNow = Object.fromEntries(
      Object.entries(data ?? {})
        .filter(([k]) => ['rapid', 'slow', 'standard', 'fast'].find(v => v === k))
        .map(([k, v]) => [k, v / 1e9]),
    )

    const nativeToken = priceResult[network.coingeckoId].usd
    const gas = {
      standard: standard ?? gasNow?.standard,
      fast: fast ?? gasNow?.fast,
      slow: slow ?? (safeLow as number) ?? gasNow?.slow,
      instant: instant ?? (fastest as number) ?? gasNow?.rapid,
    }

    setNetworkPrices.value({ nativeToken, gas })
  }, [network, setNetworkPrices])

  useEffect(() => {
    fetchPrices().catch(setNetworkPrices.error)
  }, [fetchPrices, network, setNetworkPrices.error])

  useInterval(() => {
    fetchPrices().catch(setNetworkPrices.error)
  }, 5 * 60 * 1000)

  return <networkPricesCtx.Provider value={networkPrices}>{children}</networkPricesCtx.Provider>
}

const JsonRpcProvider: FC = ({ children }) => {
  const network = useContext(networkCtx)

  const value = useMemo(() => {
    if (!network) return undefined

    const { rpcEndpoints, parentChainId } = network
    const provider = new providers.FallbackProvider(rpcEndpoints.map(e => new providers.JsonRpcProvider(e)))

    let parentChainProvider
    if (parentChainId) {
      const { rpcEndpoints: parentRpcEndpoints } = getNetwork(parentChainId)
      parentChainProvider = new providers.FallbackProvider(parentRpcEndpoints.map(e => new providers.JsonRpcProvider(e)))
    }

    return { provider, parentChainProvider }
  }, [network])

  return <jsonRpcCtx.Provider value={value}>{children}</jsonRpcCtx.Provider>
}

export const useJsonRpcProviders = (): { provider: Provider; parentChainProvider?: Provider } | undefined => useContext(jsonRpcCtx)

export const useNetwork = (): Network<unknown, unknown> => useContext(networkCtx)

export const useNetworkPrices = (): FetchState<NetworkPrices> => useContext(networkPricesCtx)

export const useNetworkAddresses = (): AllNetworks['addresses'] => useContext(networkCtx).addresses as AllNetworks['addresses']

export const useGetExplorerUrl = (): Network<unknown, unknown>['getExplorerUrl'] => useNetwork().getExplorerUrl

export const NetworkProvider = composedComponent(ChainIdProvider, NetworkConfigProvider, NetworkPricesProvider, JsonRpcProvider)
