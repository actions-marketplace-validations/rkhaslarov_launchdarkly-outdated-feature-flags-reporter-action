export type Variation = {
    isFallthrough: boolean // Default Value of the flag
    targets?: number
    rules?: number
    contextTargets?: number
    nullRules?: number
}

export type Environment = {
    _summary: {
        prerequisites: number
        variations: Record<string, Variation>
    }
}

export type MaintainerTeam = {
    key: string
    name: string
}

export type FeatureFlag = {
    _maintainerTeam: MaintainerTeam
    _links: {
        self: {
            href: string
        }
    }
    creationDate: string
    defaults: {
        offVariation: number
        onVariation: number
    }
    key: string
    kind: string
    maintainerTeamKey: string
    name: string
    tags: string[]
    temporary: boolean
    environments: Record<string, Environment>
    codeReferences?: {
        items: { sourceLink: string }[]
    }
}

export type Response = {
    items: FeatureFlag[]
    _links?: {
        next?: {
            href?: string
        }
    }
}
