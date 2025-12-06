import * as core from '@actions/core'
import { getFeatureFlags, getFeatureFlagsByMaintainerTeams } from './service'
import { runRulesEngine } from './rules'
import { getReportByType } from './reports'

export async function run(): Promise<void> {
    try {
        const accessToken: string = core.getInput('access-token')
        const projectKey: string = core.getInput('project-key')
        const environment: string = core.getInput('environment-key')
        const maintainerTeams: string[] = core
            .getInput('maintainer-teams')
            ?.split(',')

        core.info(`Starting request...`)

        const requestParams = {
            accessToken,
            projectKey,
            environment
        }

        const featureFlags =
            maintainerTeams.length > 0
                ? await getFeatureFlagsByMaintainerTeams({
                      maintainerTeams,
                      ...requestParams
                  })
                : await getFeatureFlags({
                      ...requestParams
                  })

        if (featureFlags.length === 0) {
            core.info(`Feature Flags list is empty`)
            return
        }

        const filteredFeatureFlags = runRulesEngine(featureFlags)

        if (filteredFeatureFlags.length === 0) {
            return
        }

        core.info(
            `Feature Flags ready for review: ${filteredFeatureFlags.map(flag => flag.key)}`
        )

        const reporter = getReportByType()

        if (reporter) {
            await reporter.run(filteredFeatureFlags)
        }

        core.setOutput('feature-flags', filteredFeatureFlags)
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message)
            return
        }

        core.setFailed('An unknown error occurred')
    }
}
