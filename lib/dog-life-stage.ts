import { DogLifeStage, type DogStatus } from "@/prisma/generated/client";

// Sales status → life stage, for dogs created without an explicit lifeStage.
// Breeding stock are adults; anything being sold (available, reserved, sold)
// is a puppy.
export function lifeStageFromStatus(status: DogStatus | string | undefined): DogLifeStage {
    return status === "BREEDING_STOCK" || status === undefined ? DogLifeStage.ADULT : DogLifeStage.PUPPY;
}
