import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mobileApps, mobileAppsCopy, mobileAppsReview, mobileAppsSource } from "./index";

describe("Mobile Apps content invariants", () => {
  it("the flyer is a local 744 x 1280 image", () => {
    expect(mobileApps.image?.url.startsWith("/images/resources/")).toBe(true);
    expect(mobileApps.image?.width).toBe(744);
    expect(mobileApps.image?.height).toBe(1280);
  });

  it("nothing that renders contains das.edu.pk", () => {
    expect(JSON.stringify(mobileApps)).not.toContain("das.edu.pk");
    expect(JSON.stringify(mobileAppsCopy)).not.toContain("das.edu.pk");
  });

  it("has the four apps in order, with no labels", () => {
    expect(mobileApps.apps.map((a) => a.id)).toEqual(["scarlet-english", "scarlet-math", "scarlet-urdu", "lms-app"]);
    expect(mobileApps.apps.map((a) => a.name)).toEqual(["Scarlet English", "Scarlet Math", "Scarlet Urdu", "LMS App"]);
    for (const a of mobileApps.apps) expect(a.label).toBeUndefined();
  });

  it("only Scarlet English has a link, and it is the reference link", () => {
    const withUrl = mobileApps.apps.filter((a) => a.url !== "");
    expect(withUrl.map((a) => a.id)).toEqual(["scarlet-english"]);
    expect(withUrl[0].url).toBe(mobileAppsSource.referenceLinks["scarlet-english"]);
    expect(withUrl[0].linkType).toBe("direct-download");
    expect(mobileApps.apps.find((a) => a.id === "lms-app")?.linkType).toBe("play-store");
  });

  it("records the reference link for every app, including the dead ones", () => {
    expect(mobileAppsSource.referenceLinks).toEqual({
      "scarlet-english": "https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing",
      "scarlet-math": "https://drive.google.com/file/d/1z1_05GubJarRVNP-8fno7Az_AVIiDPyi/view?usp=sharing",
      "scarlet-urdu": "https://drive.google.com/file/d/1wFRsPmd0EAdPG4E5DWsKZ27JsVQhptlo/view?usp=sharing",
      "lms-app": "https://play.google.com/store/apps/details?id=com.darearqam.daslms",
    });
    expect(mobileAppsSource.copiedOn).toBe("2026-10-12");
    expect(mobileAppsSource.linksCheckedOn).toBe("2026-10-12");
  });

  it("is pending client approval", () => {
    expect(mobileAppsReview.status).toBe("pending-client-approval");
  });

  it("has the interface strings from the data model", () => {
    expect(mobileAppsCopy).toEqual({
      buttons: {
        "play-store": "Get it on Google Play",
        "app-store": "Download on the App Store",
        "direct-download": "Download for Android",
      },
      directDownloadNote: "Installs from outside the Play Store",
      unavailable: "Not available at the moment",
      newTab: "opens in a new tab",
    });
  });
});

describe("client-review document (SC-010)", () => {
  const doc = readFileSync(path.join(process.cwd(), "docs/content-source/resources/client-review.md"), "utf8").replace(/\r\n/g, "\n");

  it("lists the six portal URLs and the Student Login security note", () => {
    for (const url of [
      "http://www.dais.edu.pk/",
      "http://eportal.das.edu.locumset.com/",
      "http://203.170.66.35/pp",
      "https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fadmin.google.com%2Fmail%2F&hd=das.edu.pk",
      "https://play.google.com/store/apps/details?id=com.darearqam.daslms",
      "https://forms.gle/6YDN9wrGiwWgkx3z8",
    ]) {
      expect(doc, url).toContain(url);
    }
    expect(doc).toMatch(/http:\/\/203\.170\.66\.35\/pp[^\n]*Not secure/);
  });

  it("lists every app reference link", () => {
    for (const url of Object.values(mobileAppsSource.referenceLinks)) expect(doc, url).toContain(url);
  });

  it("covers findings R1 to R7", () => {
    for (let i = 1; i <= 7; i++) expect(doc).toMatch(new RegExp(`\\bR${i}\\b`));
  });

  it("asks for a working replacement for each dead app link", () => {
    for (const name of ["Scarlet Math", "Scarlet Urdu", "LMS App"]) {
      expect(doc, name).toMatch(new RegExp(`working replacement[^\\n]*${name}|${name}[^\\n]*working replacement`));
    }
  });
});
