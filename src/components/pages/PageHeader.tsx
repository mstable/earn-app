import React, { FC } from 'react'
import styled from 'styled-components'

import { ReactComponent as EarnIcon } from '../icons/circle/earn.svg'
import { useAccountOpen, useBannerMessage } from '../../context/AppProvider'
import { BannerMessage } from '../layout/BannerMessage'

export enum PageAction {
  Account = 'Account',
  Earn = 'Earn',
}

interface Props {
  action: PageAction
  subtitle?: string
}

const ActionIcons: { [action: string]: JSX.Element } = {
  Earn: <EarnIcon />,
}

const Icon = styled.div<{ inverted?: boolean }>`
  display: flex;
  margin-right: 0.5rem;

  img,
  svg {
    width: 2.5rem;
    height: 2.5rem;

    * {
      fill: ${({ theme }) => theme.color.body};
    }
  }

  img + div {
    display: none;
  }
`

const Container = styled.div<{
  accountOpen?: boolean
  messageVisible?: boolean
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0 3rem;

  h2 {
    font-size: 2rem;
    font-weight: 600;
  }

  p {
    padding: 0.25rem 0 0;
    font-size: 1rem;
    color: ${({ theme }) => theme.color.bodyAccent};
  }
`

const Row = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`

const ChildrenRow = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  flex-direction: column;
  align-items: center;

  @media (min-width: ${({ theme }) => theme.viewportWidth.s}) {
    flex-direction: row;
  }
`

export const PageHeader: FC<Props> = ({ children, action, subtitle }) => {
  const accountOpen = useAccountOpen()
  const [bannerMessage] = useBannerMessage()
  const icon = ActionIcons[action]

  return (
    <div>
      <Container accountOpen={accountOpen}>
        <Row>
          <Icon inverted>{icon}</Icon>
          <h2>{action}</h2>
        </Row>
        {subtitle && <p>{subtitle}</p>}
        {children && <ChildrenRow>{children}</ChildrenRow>}
      </Container>
      {!!bannerMessage && <BannerMessage />}
    </div>
  )
}
