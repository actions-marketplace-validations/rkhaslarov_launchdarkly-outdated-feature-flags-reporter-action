import { FeatureFlag } from './types'
import { differenceInCalendarDays } from 'date-fns'
import * as core from '@actions/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rule = (flag: FeatureFlag, ...args: any[]) => boolean

const isNotPermanent: Rule = (flag: FeatureFlag): boolean => {
    core.info(`Rule - isNotPermanent: ${flag.key} ${flag.temporary}`)
    return flag.temporary
}

const isNotMultivariate: Rule = (flag: FeatureFlag): boolean => {
    core.info(`Rule - isNotMultivariate: ${flag.key} ${flag.kind}`)
    return flag.kind === 'boolean'
}

const isNotNewlyCreated: Rule = (flag: FeatureFlag): boolean => {
    const threshold = Number(core.getInput('threshold'))
    const createdDate = new Date(flag.creationDate)
    const diffInDays = differenceInCalendarDays(Date.now(), createdDate)

    core.info(`Rule - isNotNewlyCreated: ${flag.key} ${diffInDays}`)

    return diffInDays >= threshold
}

const dontHaveCodeReferences: Rule = (flag: FeatureFlag): boolean => {
    core.info(
        `Rule - dontHaveCodeReferences: ${flag.key} ${flag.codeReferences?.items?.length}`
    )

    return flag.codeReferences?.items?.length === 0
}

const isEnabledByDefaultAndNoOffVariationTargets: Rule = (
    flag: FeatureFlag
): boolean => {
    const environment: string = core.getInput('environment-key')
    const currentEnvironment = flag.environments[environment]?._summary

    if (!currentEnvironment) return false

    const variations = currentEnvironment.variations
    const defaults = flag.defaults

    const isEnabledByDefault = variations[defaults.onVariation]?.isFallthrough

    if (isEnabledByDefault) {
        const offVariation = variations[defaults.offVariation]

        core.info(
            `Rule - isEnabledByDefaultAndNoOffVariationTargets: ${flag.key} ${JSON.stringify(offVariation)}`
        )

        return (
            !offVariation?.targets &&
            !offVariation?.rules &&
            !offVariation?.contextTargets
        )
    }

    return false
}

const isDisabledByDefaultAndNoOnVariationTargets: Rule = (
    flag: FeatureFlag
): boolean => {
    const environment: string = core.getInput('environment-key')
    const currentEnvironment = flag.environments[environment]?._summary

    if (!currentEnvironment) return false

    const variations = currentEnvironment.variations
    const defaults = flag.defaults

    const isDisabledByDefault = variations[defaults.offVariation]?.isFallthrough

    if (isDisabledByDefault) {
        const onVariation = variations[defaults.onVariation]

        core.info(
            `Rule - isDisabledByDefaultAndNoOnVariationTargets: ${flag.key} ${JSON.stringify(onVariation)}`
        )

        return (
            !onVariation?.targets &&
            !onVariation?.rules &&
            !onVariation?.contextTargets
        )
    }

    return false
}

export const runRulesEngine = (featureFlags: FeatureFlag[]): FeatureFlag[] =>
    featureFlags.filter(featureFlag => {
        core.info(`########### ${featureFlag.key} ########### `)

        if (
            isNotNewlyCreated(featureFlag) &&
            isNotMultivariate(featureFlag) &&
            isNotPermanent(featureFlag)
        ) {
            return (
                isDisabledByDefaultAndNoOnVariationTargets(featureFlag) ||
                isEnabledByDefaultAndNoOffVariationTargets(featureFlag) ||
                dontHaveCodeReferences(featureFlag)
            )
        }

        return false
    })
