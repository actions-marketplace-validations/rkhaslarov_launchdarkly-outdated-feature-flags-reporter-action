import { FeatureFlag } from '../types'
import { differenceInCalendarDays } from 'date-fns'
import * as core from '@actions/core'
import * as yaml from 'js-yaml'

type RuleConfig = {
    enabled?: boolean
    days?: number
    tags?: string[]
}

type RulesConfig = {
    'min-age'?: RuleConfig
    'exclude-tags'?: RuleConfig
    'temporary-only'?: RuleConfig
    'boolean-only'?: RuleConfig
    unused?: RuleConfig
    'default-only'?: RuleConfig
}

const parseRulesConfig = (): RulesConfig => {
    const rulesConfigInput = core.getInput('rules-config')

    try {
        return yaml.load(rulesConfigInput) as RulesConfig
    } catch (error) {
        core.setFailed(`Failed to parse rules-config: ${error}`)
        throw error
    }
}

const isRuleEnabled = (
    config: RulesConfig,
    ruleName: keyof RulesConfig
): boolean => {
    return config[ruleName]?.enabled !== false
}

const isTemporaryOnly = (config: RulesConfig, flag: FeatureFlag): boolean => {
    if (!isRuleEnabled(config, 'temporary-only')) {
        return true
    }

    core.debug(`Rule - temporary-only: ${flag.key} ${flag.temporary}`)
    return flag.temporary
}

const isBooleanOnly = (config: RulesConfig, flag: FeatureFlag): boolean => {
    if (!isRuleEnabled(config, 'boolean-only')) {
        return true
    }

    core.debug(`Rule - boolean-only: ${flag.key} ${flag.kind}`)
    return flag.kind === 'boolean'
}

const isNotExcludedByTags = (
    config: RulesConfig,
    flag: FeatureFlag
): boolean => {
    if (!isRuleEnabled(config, 'exclude-tags')) {
        return true
    }

    const excludedTags = config['exclude-tags']?.tags || []

    core.debug(`Rule - exclude-tags: ${flag.key} ${flag.tags}`)

    return flag.tags.every(tag => !excludedTags.includes(tag))
}

const hasMinAge = (config: RulesConfig, flag: FeatureFlag): boolean => {
    if (!isRuleEnabled(config, 'min-age')) {
        return true
    }

    const minDays = config['min-age']?.days || 30
    const createdDate = new Date(flag.creationDate)
    const diffInDays = differenceInCalendarDays(Date.now(), createdDate)

    core.debug(`Rule - min-age: ${flag.key} ${diffInDays} days`)

    return diffInDays >= minDays
}

const isUnused = (config: RulesConfig, flag: FeatureFlag): boolean => {
    if (!isRuleEnabled(config, 'unused')) {
        return false
    }

    core.debug(
        `Rule - unused: ${flag.key} ${flag.codeReferences?.items?.length}`
    )

    return flag.codeReferences?.items?.length === 0
}

const isDefaultOnly = (config: RulesConfig, flag: FeatureFlag): boolean => {
    if (!isRuleEnabled(config, 'default-only')) {
        return false
    }

    const environment: string = core.getInput('environment-key')
    const currentEnvironment = flag.environments[environment]?._summary

    if (!currentEnvironment?.variations || currentEnvironment.prerequisites > 0)
        return false

    const variations = Object.values(currentEnvironment.variations)

    // Filtering non-empty variations - check each property exists and has a value
    const targetedVariations = variations.filter(variation => {
        return (
            variation?.targets ||
            variation?.rules ||
            variation?.contextTargets ||
            variation?.nullRules
        )
    })

    core.debug(
        `Rule - default-only: ${flag.key} ${JSON.stringify(targetedVariations)}`
    )

    // If a single variation is targeted check if it's enabled by default
    if (targetedVariations.length === 1) {
        const [targetedVariation] = targetedVariations

        return Boolean(targetedVariation.isFallthrough)
    }

    if (targetedVariations.length === 0) {
        return true
    }

    return false
}

export const runRulesEngine = (featureFlags: FeatureFlag[]): FeatureFlag[] => {
    const config = parseRulesConfig()

    return featureFlags.filter(featureFlag => {
        core.debug(`########### ${featureFlag.key} ########### `)

        // All filter rules must pass
        if (
            !hasMinAge(config, featureFlag) ||
            !isNotExcludedByTags(config, featureFlag) ||
            !isTemporaryOnly(config, featureFlag) ||
            !isBooleanOnly(config, featureFlag)
        ) {
            return false
        }

        // At least one detection rule must pass
        return (
            isUnused(config, featureFlag) || isDefaultOnly(config, featureFlag)
        )
    })
}
