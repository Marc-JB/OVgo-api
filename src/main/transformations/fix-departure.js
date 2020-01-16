import { searchStation } from "../searchStations.js"

/**
 * @throws {Error}
 * @param {import("../data-access/ApiCacheManager").ApiCacheManager} data
 * @param {import("../models/ns-departure.js").NsDeparture} it
 * @param {"en" | "nl"} [language]
 * @returns {Promise<import("../models/ns-departure.js").NsDeparture>}
 */
export async function fixNsDeparture(data, it, language = "en") {
    if (it.product.operatorName.toLowerCase() === "r-net") {
        it.product.operatorName = it.product.longCategoryName.toLowerCase() === "sprinter" ? `R-net ${language === "en" ? "by" : "door"} NS` : `R-net ${language === "en" ? "by" : "door"} Qbuzz`
    }

    await Promise.all([
        (async () => {
            it.direction = it.direction ? (await searchStation(data, it.direction)).name : it.direction
        })(),
        (async () => {
            it.routeStations = it.routeStations ? await Promise.all(
                it.routeStations.map(async it => ({
                    uicCode: it.uicCode,
                    mediumName: (await searchStation(data, it.mediumName)).name })
                )
            ) : []
        })()
    ])

    it.actualTrack = it.actualTrack || it.plannedTrack || "-"
    it.plannedTrack = it.plannedTrack || "-"
    it.actualDateTime = it.actualDateTime || it.plannedDateTime
    it.messages = it.messages || []
    it.cancelled = it.cancelled || false

    return it
}
