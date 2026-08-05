import axios from 'axios'
import { FeatureFlag, Response } from './types'

const BASE_URL = 'https://app.launchdarkly.com'
const API_URL = `${BASE_URL}/api/v2/flags`

export const buildFilters = (parts: string[]): string =>
    parts
        .filter(part => {
            const [, value] = part.split(':')
            return Boolean(value?.trim())
        })
        .join(',')

const makeRequest = async (
    url: string,
    accessToken: string,
    params?: Record<string, string>
): Promise<Response> => {
    const { data } = await axios.get<Response>(url, {
        headers: {
            Authorization: accessToken
        },
        params
    })

    return data
}

const makePaginatedRequest = async (
    url: string,
    accessToken: string,
    params?: Record<string, string>
): Promise<FeatureFlag[]> => {
    const flags: FeatureFlag[] = []

    let nextUrl: string | undefined = url

    while (nextUrl) {
        const response = await makeRequest(nextUrl, accessToken, params)

        if (response.items.length > 0) {
            flags.push(...response.items)
        }

        nextUrl = response._links?.next?.href
            ? `${BASE_URL}${response._links.next.href}`
            : undefined

        params = undefined
    }

    return flags
}

export const getFeatureFlags = async ({
    accessToken,
    projectKey,
    environment,
    filters = ''
}: {
    accessToken: string
    projectKey: string
    environment: string
    filters?: string
}): Promise<FeatureFlag[]> => {
    const params: Record<string, string> = {
        limit: '100',
        expand: 'evaluation,codeReferences',
        env: environment,
        archived: 'false'
    }

    if (filters) {
        params.filter = filters
    }

    return await makePaginatedRequest(
        `${API_URL}/${projectKey}`,
        accessToken,
        params
    )
}

export const getFeatureFlagsByMaintainerTeams = async ({
    accessToken,
    projectKey,
    environment,
    maintainerTeams,
    sdkAvailability
}: {
    accessToken: string
    projectKey: string
    environment: string
    maintainerTeams: string[]
    sdkAvailability?: string
}): Promise<FeatureFlag[]> => {
    const response = await Promise.all(
        maintainerTeams.map(
            async team =>
                await getFeatureFlags({
                    accessToken,
                    projectKey,
                    environment,
                    filters: buildFilters([
                        `maintainerTeamKey:${team}`,
                        `sdkAvailability:${sdkAvailability}`
                    ])
                })
        )
    )

    return response.flat()
}
