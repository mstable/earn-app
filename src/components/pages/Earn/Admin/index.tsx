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

export const AdminPage: FC = () => {
  const [hasDualReward, toggleDualReward] = useToggle(false)

  return (
    <CurveProvider>
      <EarnDataProvider>
        <EarnAdminProvider>
          <div>
            <Row>
              <H2>EARN Admin Dashboard {hasDualReward && '(Dual)'}</H2>
              <Button onClick={toggleDualReward}>Toggle dual rewards</Button>
            </Row>
            <div>
              <StakingRewardContractsTable hasDualReward={hasDualReward} />
              <DistributeRewardsForm hasDualReward={hasDualReward} />
            </div>
          </div>
        </EarnAdminProvider>
      </EarnDataProvider>
    </CurveProvider>
  )
}
