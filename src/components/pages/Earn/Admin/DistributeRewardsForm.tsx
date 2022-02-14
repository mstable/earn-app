import React, { FC, useCallback, useMemo, useState } from 'react'
import { BigNumber } from 'ethers'
import styled from 'styled-components'

import { useTokenAllowance } from '../../../../context/TokensProvider'
import { useOwnAccount, useSigner } from '../../../../context/AccountProvider'
import { useNetworkAddresses } from '../../../../context/NetworkProvider'
import { TransactionForm } from '../../../forms/TransactionForm'
import { TokenAmount } from '../../../core/TokenAmount'
import { NumberFormat } from '../../../core/Amount'
import { ThemedSkeleton } from '../../../core/ThemedSkeleton'
import { useEarnAdminDispatch, useEarnAdminState } from './EarnAdminProvider'
import { Interfaces } from '../../../../types'
import {
  RewardsDistributor,
  RewardsDistributorDual,
  RewardsDistributorDual__factory,
  RewardsDistributor__factory,
} from '../../../../typechain'
import { BigDecimal } from '../../../../web3/BigDecimal'
import { TransactionManifest } from '../../../../web3/TransactionManifest'
import { Button } from '../../../core/Button'
import { SendButton } from '../../../forms/SendButton'
import { useToggleDualRewards } from '../../../../hooks/useToggleDualRewards'

const Row = styled.div`
  margin-bottom: 16px;
`

const Confirm: FC = () => {
  const {
    data: { rewardsToken },
    totalFunds,
    recipientAmounts,
  } = useEarnAdminState()
  const [hasDualReward] = useToggleDualRewards()

  const token = rewardsToken || { decimals: 18, symbol: 'MTA' }

  return (
    <>
      <Row>
        <h3>Total amount</h3>
        <TokenAmount
          symbol={token.symbol}
          amount={totalFunds?.platform}
          decimalPlaces={6}
          format={NumberFormat.Countup}
          countup={{ decimals: 6 }}
        />
        {hasDualReward && (
          <TokenAmount
            symbol={token.symbol}
            amount={totalFunds?.reward}
            decimalPlaces={6}
            format={NumberFormat.Countup}
            countup={{ decimals: 6 }}
          />
        )}
      </Row>
      <Row>
        <h3>Breakdown</h3>
        <code>
          {Object.keys(recipientAmounts)
            .sort()
            .map(key => (
              <div key={key}>
                <div>{key}</div>
                <div>
                  {recipientAmounts[key].reward?.amount
                    ? `${recipientAmounts[key].reward?.amount?.format()} (${recipientAmounts[key].reward?.amount?.exact})`
                    : '-'}
                </div>
                {hasDualReward && (
                  <div>
                    {recipientAmounts[key].reward?.amount
                      ? `${recipientAmounts[key].platform?.amount?.format()} (${recipientAmounts[key].platform?.amount?.exact})`
                      : '-'}
                  </div>
                )}
                <br />
              </div>
            ))}
        </code>
      </Row>
    </>
  )
}

// FIXME: - fix to use platformToken too for approval?
const Input: FC = () => {
  const {
    data: { rewardsToken, rewardsDistributor },
    totalFunds,
  } = useEarnAdminState()
  const spender = rewardsDistributor?.id

  return rewardsToken && spender ? (
    <Row>
      {totalFunds?.reward && rewardsToken?.allowances[spender]?.exact.lt(totalFunds.reward.exact) ? (
        <>
          <h3>Approve amount</h3>
          <p>
            Approve transfer of {totalFunds.reward.simple} {rewardsToken.symbol}
          </p>
          <SendButton
            valid
            title="Approve"
            handleSend={() => {}}
            approve={{
              address: rewardsToken.address,
              amount: totalFunds.reward,
              spender,
            }}
          />
        </>
      ) : null}
    </Row>
  ) : (
    <ThemedSkeleton />
  )
}

const CustomRecipients: FC = () => {
  const [recipientValue, setRecipientValue] = useState<string>()
  const { recipientAmounts } = useEarnAdminState()
  const { addCustomRecipient, removeCustomRecipient, setRewardAmount, setPlatformAmount } = useEarnAdminDispatch()
  const [hasDualReward] = useToggleDualRewards()

  return (
    <div>
      <Row>
        <h4>Recipients</h4>
        <div>
          <input placeholder="Recipient" onChange={e => setRecipientValue(e.target.value)} />
          <Button
            onClick={() => {
              if (recipientValue) {
                addCustomRecipient(recipientValue)
                setRecipientValue(undefined)
              }
            }}
          >
            Add recipient
          </Button>
        </div>
        <code>
          {Object.keys(recipientAmounts)
            .filter(recipient => recipientAmounts[recipient].custom)
            .map(recipient => (
              <div key={recipient}>
                <div>Address: {recipient}</div>
                <div>Amount: {recipientAmounts[recipient].reward?.amount?.format()}</div>
                <div>
                  Set amount:{' '}
                  <input
                    type="number"
                    onChange={e => {
                      setRewardAmount(recipient, e.currentTarget.value)
                    }}
                  />
                  {hasDualReward && (
                    <input
                      type="number"
                      onChange={e => {
                        setPlatformAmount(recipient, e.currentTarget.value)
                      }}
                    />
                  )}
                </div>
                <div>
                  <Button
                    onClick={() => {
                      removeCustomRecipient(recipient)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
        </code>
      </Row>
    </div>
  )
}

const Inputs: FC<{ reason?: string }> = ({ reason }) => {
  const { useCustomRecipients } = useEarnAdminState()
  const { toggleCustomRecipients } = useEarnAdminDispatch()
  return (
    <div>
      {reason ? (
        <Row>
          <h3>Validation</h3>
          <div>{reason}</div>
        </Row>
      ) : null}
      <Row>
        <Button onClick={toggleCustomRecipients}>Toggle custom recipients</Button>
      </Row>
      {useCustomRecipients ? (
        <Row>
          <h3>Custom recipients/amounts</h3>
          <CustomRecipients />
        </Row>
      ) : null}
      <Input />
    </div>
  )
}

export const DistributeRewardsForm: FC = () => {
  const account = useOwnAccount()
  const signer = useSigner()
  const {
    data: { rewardsDistributor },
    useCustomRecipients,
    recipientAmounts,
    totalFunds,
  } = useEarnAdminState()
  const networkAddresses = useNetworkAddresses()
  const rewardsDistributorAddress = rewardsDistributor?.id
  const allowance = useTokenAllowance(networkAddresses.MTA, rewardsDistributorAddress)
  const [hasDualReward] = useToggleDualRewards()

  const reason = useMemo<string | undefined>(() => {
    if (!account) {
      return 'Not connected'
    }

    if (!(rewardsDistributorAddress && rewardsDistributor && allowance)) {
      return 'Fetching data'
    }

    if (!rewardsDistributor?.fundManagers.includes(account.toLowerCase())) {
      return 'Not a fund manager'
    }

    if (!totalFunds?.reward.exact.gt(0)) {
      return 'Funds not allocated'
    }

    if (allowance?.exact.lt(totalFunds?.reward.exact)) {
      return 'Exceeds approved amount'
    }
    return undefined
  }, [account, allowance, rewardsDistributor, rewardsDistributorAddress, totalFunds])

  const valid = true // !reason

  const createTransaction = useCallback(
    (
      formId: string,
    ): TransactionManifest<Interfaces.RewardsDistributor | Interfaces.RewardsDistributorDual, 'distributeRewards'> | void => {
      const contract = (() => {
        if (!signer || !rewardsDistributorAddress) return
        if (hasDualReward) return RewardsDistributorDual__factory.connect(rewardsDistributorAddress, signer)
        return RewardsDistributor__factory.connect(rewardsDistributorAddress, signer)
      })()

      const args: [string[], BigNumber[], BigNumber[]] = Object.entries(recipientAmounts)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, { custom }]) => (useCustomRecipients ? !!custom : !custom))
        .reduce<[string[], BigNumber[], BigNumber[]]>(
          ([addresses, rewardAmounts, platformAmounts], [recipient, { reward, platform }]) => [
            [...addresses, recipient],
            [...rewardAmounts, (reward?.amount ?? BigDecimal.ZERO).exact],
            [...platformAmounts, (platform?.amount ?? BigDecimal.ZERO).exact],
          ],
          [[], [], []],
        )

      if (!contract || !args.length) return

      if (hasDualReward) {
        return new TransactionManifest<Interfaces.RewardsDistributorDual, 'distributeRewards'>(
          contract as RewardsDistributorDual,
          'distributeRewards',
          args,
          {
            present: 'Distributing rewards',
            past: 'Distributed rewards',
          },
          formId,
        )
      }

      return new TransactionManifest<Interfaces.RewardsDistributor, 'distributeRewards'>(
        contract as RewardsDistributor,
        'distributeRewards',
        [args[0], args[1]],
        {
          present: 'Distributing rewards',
          past: 'Distributed rewards',
        },
        formId,
      )
    },
    [recipientAmounts, hasDualReward, signer, rewardsDistributorAddress, useCustomRecipients],
  )

  return (
    <TransactionForm
      confirm={<Confirm />}
      confirmLabel="Distribute rewards"
      createTransaction={createTransaction}
      formId="distributeRewards"
      input={<Inputs reason={reason} />}
      valid={valid}
    />
  )
}
