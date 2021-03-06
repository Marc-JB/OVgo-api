import { searchStation } from "../../searchStations"
import { NsTrainFacility, NsTrainInfo, NsTrainPart } from "../../models/ns/NsTrainInfo"
import { NsDeparture } from "../../models/ns/NsDeparture"
import { DataRepository } from "../Repositories"

const qbuzzFacilities: NsTrainFacility[] = ["FIETS"]

const qbuzz2 = {
    type: "GTW-E 2/6 Qbuzz",
    faciliteiten: qbuzzFacilities,
    afbeelding: "https://marc-jb.github.io/OVgo-api/gtw_qbuzz_26.png",
    zitplaatsen: {
        staanplaatsEersteKlas: 0,
        staanplaatsTweedeKlas: 0,
        zitplaatsEersteKlas: 0,
        zitplaatsTweedeKlas: 92,
        klapstoelEersteKlas: 0,
        klapstoelTweedeKlas: 21
    },
    bakken: []
}

const qbuzz3 = {
    type: "GTW-E 2/8 Qbuzz",
    faciliteiten: qbuzzFacilities,
    afbeelding: "https://marc-jb.github.io/OVgo-api/gtw_qbuzz_28.png",
    zitplaatsen: {
        staanplaatsEersteKlas: 0,
        staanplaatsTweedeKlas: 0,
        zitplaatsEersteKlas: 0,
        zitplaatsTweedeKlas: 148,
        klapstoelEersteKlas: 0,
        klapstoelTweedeKlas: 24
    },
    bakken: []
}

export async function fixNsTrainInfo(
    data: DataRepository,
    it: Partial<NsTrainInfo>,
    departure: NsDeparture | null = null,
    language: "en" | "nl" = "en"
): Promise<NsTrainInfo> {
    it.materieeldelen = it.materieeldelen ?? []
    it.drukteVoorspelling = it.drukteVoorspelling ?? []
    it.ingekort = it.ingekort ?? false

    const type = it.type?.toLowerCase() ?? ""
    const isQbuzzDMG = it.vervoerder === "R-net" && !it.materieeldelen.some(it => it.type === "Flirt 2 TAG")
    const isEurostar = type === "eurostar"

    if (it.vervoerder === "R-net") {
        it.vervoerder = `R-net ${language === "en" ? "by" : "door"} ${isQbuzzDMG ? "Qbuzz" : "NS"}`
    } else if (isEurostar) {
        it.vervoerder = `Eurostar/NS Internation${language === "en" ? "a" : "aa"}l`
    } else if (type === "tvg") {
        it.vervoerder = `Thalys/NS Internation${language === "en" ? "a" : "aa"}l`
    } else if (type === "ice") {
        it.vervoerder = `DB/NS Internation${language === "en" ? "a" : "aa"}l`
    }

    it.station = it.station ? (await searchStation(data, it.station))?.name ?? it.station : it.station

    if (isQbuzzDMG) it.materieeldelen = it.materieeldelen.map(it => it.type.includes("8") ? qbuzz3 : qbuzz2)

    it.materieeldelen = await Promise.all(it.materieeldelen.map(async (part: Partial<NsTrainPart>) => {
        part.faciliteiten = part.faciliteiten ?? []

        if (isEurostar && !!part.afbeelding) {
            part.afbeelding = "https://marc-jb.github.io/OVgo-api/eurostar_e320.png"
            part.type = "Eurostar e320/Class 374"
        }

        if (part.eindbestemming)
            part.eindbestemming = (await searchStation(data, part.eindbestemming))?.name
        else if (departure?.direction)
            part.eindbestemming = departure.direction

        if (part.type?.startsWith("Flirt") && it.vervoerder === "NS" && !part.faciliteiten.includes("TOEGANKELIJK"))
            part.faciliteiten.push("TOEGANKELIJK")

        if (part.type?.startsWith("SGM") && part.faciliteiten.includes("TOILET"))
            part.faciliteiten = part.faciliteiten.filter(it => it !== "TOILET")

        return part
    })) as NsTrainPart[]

    it.geplandeLengte = it.geplandeLengte ?? it.lengte
    it.bron = it.bron ?? "NS"

    // @ts-expect-error
    return it
}
