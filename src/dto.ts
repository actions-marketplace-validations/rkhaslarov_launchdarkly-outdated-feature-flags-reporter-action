import * as core from '@actions/core'
import { FeatureFlag } from './types'
import { formatDistance } from 'date-fns'

export type FeatureFlagDto = {
    key: string
    creationDate: string
    createdAgo: string
    link: string
}

export const toFeatureFlagDto = (flag: FeatureFlag): FeatureFlagDto => {
    const projectKey = core.getInput('project-key')
    const environment = core.getInput('environment-key')

    const createdDate = new Date(flag.creationDate)
    const createdAgo = formatDistance(createdDate, new Date(), {
        addSuffix: true
    })

    return {
        key: flag.key,
        creationDate: flag.creationDate,
        createdAgo,
        link: `https://app.launchdarkly.com/${projectKey}/${environment}/features/${flag.key}`
    }
}
