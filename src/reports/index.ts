import * as core from '@actions/core'
import { slackReport } from './slack'
import { apiReport } from './api'
import { FeatureFlag } from '../types'
import { defaultReport } from './default'

type Reporter = {
    run: (featureFlags: FeatureFlag[]) => Promise<void>
}

const REPORTS: Record<string, Reporter> = {
    slack: slackReport,
    api: apiReport,
    default: defaultReport
}

export const getReportByType = (): Reporter => {
    const reportType = core.getInput('report-type')

    core.info(`Using report type: ${reportType}`)

    return REPORTS[reportType] ?? REPORTS.default
}
