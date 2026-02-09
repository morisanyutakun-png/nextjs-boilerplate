import { describe, it, expect } from "vitest";
import { validateBookingUrl } from "@/lib/urlGuard";

describe("validateBookingUrl", () => {
  // --- 正常系 ---
  it("script.google.com の https URL を許可する", () => {
    const result = validateBookingUrl(
      "https://script.google.com/macros/s/ABCDEF/exec"
    );
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("script.googleusercontent.com の https URL を許可する", () => {
    const result = validateBookingUrl(
      "https://script.googleusercontent.com/some-path"
    );
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // --- 異常系: 空 ---
  it("空文字を拒否する", () => {
    const result = validateBookingUrl("");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("URLが空です");
  });

  // --- 異常系: 不正な形式 ---
  it("不正な URL 形式を拒否する", () => {
    const result = validateBookingUrl("not-a-url");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("不正なURL形式です");
  });

  // --- 異常系: http ---
  it("http (非 https) を拒否する", () => {
    const result = validateBookingUrl(
      "http://script.google.com/macros/s/ABCDEF/exec"
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("httpsのみ許可されています");
  });

  // --- 異常系: 許可外ホスト ---
  it("許可リストにないホストを拒否する", () => {
    const result = validateBookingUrl("https://evil.example.com/phishing");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("許可されていないホスト");
  });

  it("google.com (script.google.com でない) を拒否する", () => {
    const result = validateBookingUrl("https://google.com/some-path");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("許可されていないホスト");
  });

  // --- 異常系: javascript: プロトコル ---
  it("javascript: スキームを拒否する", () => {
    const result = validateBookingUrl("javascript:alert(1)");
    expect(result.ok).toBe(false);
  });

  // --- 異常系: data: プロトコル ---
  it("data: スキームを拒否する", () => {
    const result = validateBookingUrl("data:text/html,<h1>hi</h1>");
    expect(result.ok).toBe(false);
  });

  // --- 異常系: サブドメイン偽装 ---
  it("script.google.com.evil.com のような偽装ホストを拒否する", () => {
    const result = validateBookingUrl(
      "https://script.google.com.evil.com/path"
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("許可されていないホスト");
  });
});
