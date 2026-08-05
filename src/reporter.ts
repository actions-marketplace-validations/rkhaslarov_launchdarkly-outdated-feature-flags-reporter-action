import * as core from '@actions/core'
import {
    buildFilters,
    getFeatureFlags,
    getFeatureFlagsByMaintainerTeams
} from './service'
import { runRulesEngine } from './rules'
import { getReportByType } from './reports'
import { toFeatureFlagDto } from './dto'

export async function run(): Promise<void> {
    try {
        const accessToken: string = core.getInput('access-token')
        const projectKey: string = core.getInput('project-key')
        const environment: string = core.getInput('environment-key')
        const maintainerTeams: string[] = core
            .getInput('maintainer-teams')
            .split(',')
            .map(team => team.trim())
            .filter(Boolean)
        const sdkAvailability: string = core.getInput('sdk') ?? ''

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
                      sdkAvailability,
                      ...requestParams
                  })
                : await getFeatureFlags({
                      ...requestParams,
                      filters: buildFilters([
                          `sdkAvailability:${sdkAvailability}`
                      ])
                  })

        if (featureFlags.length === 0) {
            core.info(`Feature Flags list is empty`)
            return
        }

        const limit = parseInt(core.getInput('limit'))
        const allFilteredFlags = runRulesEngine(featureFlags)

        if (allFilteredFlags.length === 0) {
            return
        }

        core.info(
            `Feature Flags ready for review: ${allFilteredFlags.map(flag => flag.key)}`
        )

        const filteredFeatureFlags = limit
            ? allFilteredFlags.slice(0, limit)
            : allFilteredFlags

        core.info(
            `Feature Flags ready for review sent to reporter: ${filteredFeatureFlags.map(flag => flag.key)}`
        )

        const reporter = getReportByType()

        if (reporter) {
            await reporter.run(filteredFeatureFlags)
        }

        const output = filteredFeatureFlags.map(toFeatureFlagDto)

        core.info(`Default reporter output: ${JSON.stringify(output)}}`)

        core.setOutput('feature-flags', output)
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message)
            return
        }

        core.setFailed('An unknown error occurred')
    }
}
