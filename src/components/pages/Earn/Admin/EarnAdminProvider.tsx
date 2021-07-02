import React, { FC, Reducer, createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { pipeline } from 'ts-pipe-compose'

import { BigDecimal } from '../../../../web3/BigDecimal'
import { useMetaToken } from '../../../../context/TokensProvider'
import { SubscribedToken } from '../../../../types'
import { RewardsDistributor, useRewardsDistributorQuery } from '../../../../graphql/ecosystem'

interface RecipientAmounts {
  [recipient: string]: {
    reward?: {
      amount?: BigDecimal
      formValue?: string
    }
    platform?: {
      amount?: BigDecimal
      formValue?: string
    }
    custom?: boolean
  }
}

interface State {
  data: {
    rewardsToken?: SubscribedToken
    rewardsDistributor?: RewardsDistributor
  }
  totalFunds?: {
    platform: BigDecimal
    reward: BigDecimal
  }
  recipientAmounts: RecipientAmounts
  useCustomRecipients: boolean
}

interface Dispatch {
  addCustomRecipient(recipient: string): void
  removeCustomRecipient(recipient: string): void
  setRewardAmount(recipient: string, amount?: string): void
  setPlatformAmount(recipient: string, amount?: string): void
  toggleCustomRecipients(): void
}

enum Actions {
  AddCustomRecipient,
  Data,
  RemoveCustomRecipient,
  SetRewardAmount,
  SetPlatformAmount,
  ToggleCustomRecipients,
}

type Action =
  | {
      type: Actions.Data
      payload: {
        manualToken?: SubscribedToken
        rewardsToken?: SubscribedToken
        rewardsDistributor?: RewardsDistributor
      }
    }
  | {
      type: Actions.SetRewardAmount
      payload: { recipient: string; amount?: string }
    }
  | {
      type: Actions.SetPlatformAmount
      payload: { recipient: string; amount?: string }
    }
  | { type: Actions.AddCustomRecipient; payload: { recipient: string } }
  | { type: Actions.RemoveCustomRecipient; payload: { recipient: string } }
  | { type: Actions.ToggleCustomRecipients }

const reduce: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case Actions.Data:
      return { ...state, data: action.payload }

    case Actions.SetRewardAmount: {
      const { amount, recipient } = action.payload

      const { rewardsToken = { decimals: 18 } } = state.data

      const recipientAmounts = {
        ...state.recipientAmounts,
        [recipient]: {
          ...state.recipientAmounts[recipient],
          reward: {
            ...state.recipientAmounts[recipient]?.reward,
            amount: BigDecimal.maybeParse(amount, rewardsToken.decimals),
            formValue: amount,
          },
        },
      }

      return {
        ...state,
        recipientAmounts,
      }
    }

    case Actions.SetPlatformAmount: {
      const { amount, recipient } = action.payload

      // FIXME: - change to platformToken
      const { rewardsToken = { decimals: 18 } } = state.data

      const recipientAmounts = {
        ...state.recipientAmounts,
        [recipient]: {
          ...state.recipientAmounts[recipient],
          platform: {
            ...state.recipientAmounts[recipient]?.reward,
            amount: BigDecimal.maybeParse(amount, rewardsToken.decimals),
            formValue: amount,
          },
        },
      }

      return {
        ...state,
        recipientAmounts,
      }
    }

    case Actions.ToggleCustomRecipients:
      return { ...state, useCustomRecipients: !state.useCustomRecipients }

    case Actions.AddCustomRecipient: {
      const { recipient } = action.payload
      return {
        ...state,
        recipientAmounts: {
          ...state.recipientAmounts,
          [recipient.toLowerCase()]: {
            ...state.recipientAmounts?.reward,
            custom: true,
          },
        },
      }
    }

    case Actions.RemoveCustomRecipient: {
      const { recipient } = action.payload
      const { [recipient.toLowerCase()]: _, ...recipientAmounts } = state.recipientAmounts

      return {
        ...state,
        recipientAmounts,
      }
    }

    default:
      throw new Error('Unhandled action')
  }
}

const updateTotalFunds = (state: State): State => {
  const {
    recipientAmounts,
    useCustomRecipients,
    data: { rewardsToken = { decimals: 18 } },
  } = state

  const rewardsFunds = Object.values(recipientAmounts)
    .filter(({ custom }) => (useCustomRecipients ? !!custom : !custom))
    .reduce(
      (_totalRewards, { reward }) => (reward?.amount ? _totalRewards.add(reward.amount) : _totalRewards),
      new BigDecimal(0, rewardsToken.decimals),
    )

  // FIXME : - change rewardToken -> platformToken
  const platformFunds = Object.values(recipientAmounts)
    .filter(({ custom }) => (useCustomRecipients ? !!custom : !custom))
    .reduce(
      (_totalRewards, { platform }) => (platform?.amount ? _totalRewards.add(platform.amount) : _totalRewards),
      new BigDecimal(0, rewardsToken.decimals),
    )

  return {
    ...state,
    totalFunds: {
      reward: rewardsFunds,
      platform: platformFunds,
    },
  }
}

const reducer: Reducer<State, Action> = pipeline(reduce, updateTotalFunds)

const initialState: State = {
  data: {},
  recipientAmounts: {},
  useCustomRecipients: false,
}

const dispatchCtx = createContext<Dispatch>({} as never)
const stateCtx = createContext<State>(initialState)

export const EarnAdminProvider: FC<{}> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setRewardAmount = useCallback<Dispatch['setRewardAmount']>(
    (recipient, amount) => {
      dispatch({
        type: Actions.SetRewardAmount,
        payload: { recipient, amount },
      })
    },
    [dispatch],
  )

  const setPlatformAmount = useCallback<Dispatch['setPlatformAmount']>(
    (recipient, amount) => {
      dispatch({
        type: Actions.SetPlatformAmount,
        payload: { recipient, amount },
      })
    },
    [dispatch],
  )

  const addCustomRecipient = useCallback<Dispatch['addCustomRecipient']>(
    recipient => {
      dispatch({
        type: Actions.AddCustomRecipient,
        payload: { recipient },
      })
    },
    [dispatch],
  )

  const removeCustomRecipient = useCallback<Dispatch['removeCustomRecipient']>(
    recipient => {
      dispatch({
        type: Actions.RemoveCustomRecipient,
        payload: { recipient },
      })
    },
    [dispatch],
  )

  const toggleCustomRecipients = useCallback<Dispatch['toggleCustomRecipients']>(() => {
    dispatch({ type: Actions.ToggleCustomRecipients })
  }, [dispatch])

  const rewardsToken = useMetaToken()

  const rewardsDistributorQuery = useRewardsDistributorQuery()
  const rewardsDistributor = rewardsDistributorQuery.data?.rewardsDistributors?.[0]

  useEffect(() => {
    dispatch({
      type: Actions.Data,
      payload: { rewardsToken, rewardsDistributor },
    })
  }, [dispatch, rewardsToken, rewardsDistributor])

  return (
    <dispatchCtx.Provider
      value={useMemo(
        () => ({
          addCustomRecipient,
          removeCustomRecipient,
          setRewardAmount,
          setPlatformAmount,
          toggleCustomRecipients,
        }),
        [addCustomRecipient, removeCustomRecipient, setPlatformAmount, setRewardAmount, toggleCustomRecipients],
      )}
    >
      <stateCtx.Provider value={state}>{children}</stateCtx.Provider>
    </dispatchCtx.Provider>
  )
}

export const useEarnAdminDispatch = (): Dispatch => useContext(dispatchCtx)

export const useEarnAdminState = (): State => useContext(stateCtx)
