/**
 * @fileoverview Functions used for the Disruptions API
 */

import { NsApi } from "./ns-api.js"
import moment from "moment"
import { expire } from "../expire.js"
import { ResponseBuilder } from "../webserver.js"

const api = NsApi.INSTANCE

/**
 * @deprecated
 * @enum {string}
 */
const DISRUPTION_TYPE = {
    WARNING: "warning",
    MAINTENANCE: "maintenance",
    DISRUPTION: "disruption"
}

/**
 * @deprecated
 * @throws {Error} when disruption type is unknown
 * @param {{ [key: string]: any }} disruption
 * @returns {string}
 */
function getDisruptionType(disruption) {
    if (disruption.type.startsWith("prio"))
        return DISRUPTION_TYPE.WARNING
    else if (disruption.type === "werkzaamheid")
        return DISRUPTION_TYPE.MAINTENANCE
    else if (disruption.type === "verstoring")
        return DISRUPTION_TYPE.DISRUPTION

    throw new Error("Disruption type unknown")
}

/**
 * @deprecated
 * @param {{ [key: string]: any }} disruption
 * @param {string} language
 */
function mapDisruption(disruption, language) {
    switch (getDisruptionType(disruption)) {
        case DISRUPTION_TYPE.WARNING:
            return {
                id: disruption.id,
                type: "warning",
                title: disruption.titel,
                description: disruption.melding.beschrijving
            }
        case DISRUPTION_TYPE.MAINTENANCE:
            return {
                id: disruption.id,
                type: "maintenance",
                title: disruption.titel,
                description: disruption.verstoring.gevolg.split(/(geen |, |,|)extra reistijd/u)[0].trim(),
                additionalTravelTime: disruption.verstoring.extraReistijd,
                cause: language === "nl" ? "Werkzaamheden" : "Maintenance",
                effect: disruption.verstoring.gevolg,
                startDate: moment(disruption.verstoring.geldigheidsLijst[0].startDatum),
                endDate: moment(disruption.verstoring.geldigheidsLijst[0].eindDatum)
            }
        case DISRUPTION_TYPE.DISRUPTION:
            return {
                id: disruption.id,
                type: "disruption",
                title: disruption.titel,
                description: [
                    disruption.verstoring.oorzaak,
                    disruption.verstoring.gevolg,
                    disruption.verstoring.verwachting
                ].filter(it => it !== null && it !== "").join(" "),
                cause: disruption.verstoring.oorzaak,
                effect: disruption.verstoring.gevolg,
                expectations: disruption.verstoring.verwachting,
                startDate: moment(disruption.verstoring.meldtijd)
            }
    }

    throw new Error()
}

/**
 * @deprecated
 * @param {import("@peregrine/webserver").ReadonlyHttpRequest} request
 */
export const getDisruptions = async(request) => {
    const language = (request.acceptedLanguages || [["en", 1]])[0][0].split("-")[0]

    const disruptions = (await api.getDisruptions(request.url.query.get("actual") === "false" ? false : true, language))
        .map(it => mapDisruption(it, language))
        .filter(it => !!it && !!it.id && !!it.type && !!it.title)
        .map(it => ({
            id: it.id,
            type: it.type,
            title: it.title,
            description: it.description || "",
            additionalTravelTime: it.additionalTravelTime || null,
            cause: it.cause || null,
            effect: it.effect || null,
            expectations: it.expectations || null,
            startDate: it.startDate || null,
            endDate: it.endDate || null
        }))

    const repsonseBuilder = new ResponseBuilder()
    expire(repsonseBuilder, 60 * 2)
    repsonseBuilder.setJsonBody(disruptions)
    return repsonseBuilder.build()
}