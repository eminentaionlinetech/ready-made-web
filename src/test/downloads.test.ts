import { describe, expect, it } from "vitest";
import { canDownload, DOWNLOAD_LINK_SECONDS, downloadFileName } from "@/lib/downloads";

describe("website downloads", () => {
  it("download links expire after 10 minutes", () => {
    expect(DOWNLOAD_LINK_SECONDS).toBe(600);
  });
  it("only paid purchases can be downloaded", () => {
    expect(canDownload({ status: "paid" })).toBe(true);
    expect(canDownload({ status: "pending" })).toBe(false);
    expect(canDownload(null)).toBe(false);
  });
  it("names the saved file after the website", () => {
    expect(downloadFileName("test-website")).toBe("test-website.zip");
    expect(downloadFileName(null)).toBe("website.zip");
  });
});
