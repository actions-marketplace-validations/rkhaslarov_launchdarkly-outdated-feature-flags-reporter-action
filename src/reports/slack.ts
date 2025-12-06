import axios from 'axios'
import * as core from '@actions/core'
import { FeatureFlag } from '../types'
import { toFeatureFlagDto } from '../dto'

type BlockMessage = {
    username: string
    icon_emoji: string
    blocks: object[]
}

function groupFeatureFlagsByMaintainerTeam(
    featureFlags: FeatureFlag[]
): Record<string, FeatureFlag[]> {
    return featureFlags.reduce(
        (acc, cur) => {
            if (acc[cur._maintainerTeam.name]) {
                acc[cur._maintainerTeam.name].push(cur)
            } else {
                acc[cur._maintainerTeam.name] = [cur]
            }

            return acc
        },
        {} as Record<string, FeatureFlag[]>
    )
}

function formatFeatureFlag(featureFlag: FeatureFlag): string {
    const dto = toFeatureFlagDto(featureFlag)

    return `\n📌 <${dto.link}|${dto.key}> | ${dto.createdAgo}`
}

function formatMaintainerTeam(maintainerTeam: string): string {
    return `\n👤 *${maintainerTeam}*: `
}

export function formatFeatureFlags(
    groupedFeatureFlags: Record<string, FeatureFlag[]>
): object[] {
    return Object.keys(groupedFeatureFlags).map((maintainerTeam: string) => {
        const text = formatMaintainerTeam(maintainerTeam).concat(
            groupedFeatureFlags[maintainerTeam]
                .map(featureFlag => formatFeatureFlag(featureFlag))
                .join('')
        )

        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text
            }
        }
    })
}

export function formatSlackMessage(
    blocks: object[],
    count: number
): BlockMessage {
    return {
        username: 'PR Reporter',
        icon_emoji: ':rolled_up_newspaper:',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `\n Please note that there are ${count} Feature Flags scheduled for removal, and we kindly request your review.`
                }
            },
            {
                type: 'divider'
            },
            ...blocks,
            {
                type: 'divider'
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: "Handle them with care during review, and consider archiving if they aren't in active use by other consumers. Otherwise, use *excluded-tags* option for manage flag manually."
                }
            },
            {
                type: 'divider'
            }
        ]
    }
}

export const slackReport = {
    async run(featureFlags: FeatureFlag[]) {
        const webhookUrl: string = core.getInput('webhook-url')

        if (!webhookUrl) {
            core.error(
                'webhook-url input is not provided, skipping Slack report'
            )
            return
        }

        const groupedFeatureFlags =
            groupFeatureFlagsByMaintainerTeam(featureFlags)
        const blocks = formatFeatureFlags(groupedFeatureFlags)
        const message = formatSlackMessage(blocks, featureFlags.length)

        core.info(
            `Sending message to Slack webhook: ${JSON.stringify(message)}`
        )

        await axios.post(webhookUrl, message)
    }
}
