import React, { FC } from 'react'

import styled from 'styled-components'
import { useToggle } from 'react-use'
import { CurveProvider } from '../../../../context/earn/CurveProvider'
import { EarnDataProvider } from '../../../../context/earn/EarnDataProvider'
import { H2 } from '../../../core/Typography'
import { StakingRewardContractsTable } from './StakingRewardContractsTable'
import { DistributeRewardsForm } from './DistributeRewardsForm'
import { EarnAdminProvider } from './EarnAdminProvider'
import { Button } from '../../../core/Button'
import { DualProvider, useToggleDualRewards } from '../../../../hooks/useToggleDualRewards'

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;

  h2 {
    padding: 0;
    margin-right: 2rem;
  }
`

const HeaderRow: FC = () => {
  const [hasDualReward, toggleDualReward] = useToggleDualRewards()
  return (
    <Row>
      <H2>EARN Admin Dashboard {hasDualReward && '(Dual)'}</H2>
      <Button onClick={toggleDualReward}>Toggle dual rewards</Button>
    </Row>
  )
}

export const AdminPage: FC = () => {
  return (
    <CurveProvider>
      <EarnDataProvider>
        <EarnAdminProvider>
          <DualProvider>
            <div>
              <HeaderRow />
              <div>
                <StakingRewardContractsTable />
                <DistributeRewardsForm />
              </div>
            </div>
          </DualProvider>
        </EarnAdminProvider>
      </EarnDataProvider>
    </CurveProvider>
  )
}
