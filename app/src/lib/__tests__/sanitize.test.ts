import {
    sanitizeText,
    sanitizeUrl,
    sanitizeOptions,
    sanitizeTitle,
    sanitizeDescription,
    sanitizeComment,
    sanitizeDisplayName,
} from "../sanitize";

describe("sanitizeText", () => {
    it("removes basic script tags", () => {
        expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it("removes nested/malformed tags", () => {
        expect(sanitizeText("<div><img src=x onerror=alert(1)></div>")).toBe("");
    });

    it("removes null bytes", () => {
        expect(sanitizeText("hello\0world")).toBe("helloworld");
    });

    it("removes HTML comments", () => {
        expect(sanitizeText("before<!-- comment -->after")).toBe("beforeafter");
    });

    it("removes CDATA sections", () => {
        expect(sanitizeText("before<![CDATA[dangerous]]>after")).toBe("beforeafter");
    });

    it("removes javascript: protocol (with whitespace bypass)", () => {
        expect(sanitizeText("j a v a s c r i p t : alert(1)")).not.toContain("javascript");
    });

    it("removes data: protocol", () => {
        expect(sanitizeText("d a t a : text/html,<h1>bad</h1>")).not.toContain("data");
    });

    it("removes vbscript: protocol", () => {
        expect(sanitizeText("v b s c r i p t : MsgBox")).not.toContain("vbscript");
    });

    it("removes on* event handlers", () => {
        expect(sanitizeText('onerror= alert(1)')).not.toContain("onerror=");
    });

    it("normalizes whitespace", () => {
        expect(sanitizeText("  hello   world  ")).toBe("hello world");
    });

    it("passes through clean text unchanged", () => {
        expect(sanitizeText("Hello, World!")).toBe("Hello, World!");
    });

    it("handles empty string", () => {
        expect(sanitizeText("")).toBe("");
    });

    it("second pass catches leftover angle brackets", () => {
        expect(sanitizeText("<b>bold</b>")).toBe("bold");
    });
});

describe("sanitizeUrl", () => {
    it("allows http URLs", () => {
        expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
    });

    it("allows https URLs", () => {
        expect(sanitizeUrl("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
    });

    it("rejects javascript: URLs", () => {
        expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    });

    it("rejects data: URLs", () => {
        expect(sanitizeUrl("data:text/html,<h1>bad</h1>")).toBe("");
    });

    it("rejects ftp: URLs", () => {
        expect(sanitizeUrl("ftp://example.com/file")).toBe("");
    });

    it("rejects invalid URLs", () => {
        expect(sanitizeUrl("not a url")).toBe("");
    });

    it("trims whitespace", () => {
        expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
    });

    it("returns empty for empty string", () => {
        expect(sanitizeUrl("")).toBe("");
    });
});

describe("sanitizeOptions", () => {
    it("sanitizes each option and truncates to 100 chars", () => {
        const longOption = "a".repeat(150);
        const result = sanitizeOptions(["<b>Yes</b>", longOption]);
        expect(result[0]).toBe("Yes");
        expect(result[1]).toHaveLength(100);
    });

    it("handles empty options array", () => {
        expect(sanitizeOptions([])).toEqual([]);
    });
});

describe("sanitizeTitle", () => {
    it("strips HTML and truncates to 200 chars", () => {
        const longTitle = "x".repeat(250);
        expect(sanitizeTitle(longTitle)).toHaveLength(200);
        expect(sanitizeTitle("<b>Title</b>")).toBe("Title");
    });
});

describe("sanitizeDescription", () => {
    it("strips HTML and truncates to 500 chars", () => {
        const longDesc = "d".repeat(600);
        expect(sanitizeDescription(longDesc)).toHaveLength(500);
    });
});

describe("sanitizeComment", () => {
    it("strips HTML and truncates to 500 chars", () => {
        expect(sanitizeComment("<script>bad</script>Nice poll!")).toBe("badNice poll!");
    });
});

describe("sanitizeDisplayName", () => {
    it("strips HTML and truncates to 30 chars", () => {
        const longName = "n".repeat(50);
        expect(sanitizeDisplayName(longName)).toHaveLength(30);
        expect(sanitizeDisplayName("<b>Name</b>")).toBe("Name");
    });
});
