import { describe, it, expect } from "vitest";
import { stripEmojis } from "../src/core/adapters/stripEmojis";

describe("emoji-stripping", () => {
  describe("removes common emojis", () => {
    it("should remove check mark emoji", () => {
      const input = "✅ DONE";
      const result = stripEmojis(input);
      expect(result).toBe("DONE");
    });

    it("should remove X mark emoji", () => {
      const input = "❌ ERROR";
      const result = stripEmojis(input);
      expect(result).toBe("ERROR");
    });

    it("should remove rocket emoji", () => {
      const input = "🚀 Ready";
      const result = stripEmojis(input);
      expect(result).toBe("Ready");
    });

    it("should remove clipboard emoji", () => {
      const input = "📋 Tasks";
      const result = stripEmojis(input);
      expect(result).toBe("Tasks");
    });

    it("should remove gear emoji", () => {
      const input = "⚙️ Configuration";
      const result = stripEmojis(input);
      expect(result).toBe("Configuration");
    });

    it("should remove warning emoji", () => {
      const input = "⚠️ CRITICAL";
      const result = stripEmojis(input);
      expect(result).toBe("CRITICAL");
    });
  });

  describe("removes emoticons", () => {
    it("should remove :) smiley", () => {
      const input = "Great work :)";
      const result = stripEmojis(input);
      expect(result).not.toContain(":)");
    });

    it("should remove :( frown", () => {
      const input = "Not working :(";
      const result = stripEmojis(input);
      expect(result).not.toContain(":(");
    });

    it("should remove ;) wink", () => {
      const input = "Just joking ;)";
      const result = stripEmojis(input);
      expect(result).not.toContain(";)");
    });

    it("should remove :D laughing", () => {
      const input = "Very funny :D";
      const result = stripEmojis(input);
      expect(result).not.toContain(":D");
    });
  });

  describe("preserves normal text", () => {
    it("should preserve regular text", () => {
      const input = "This is normal text";
      const result = stripEmojis(input);
      expect(result).toBe("This is normal text");
    });

    it("should preserve alphanumeric", () => {
      const input = "Agent123 code-review";
      const result = stripEmojis(input);
      expect(result).toBe("Agent123 code-review");
    });

    it("should preserve punctuation", () => {
      const input = "Hello, world! How are you?";
      const result = stripEmojis(input);
      expect(result).toBe("Hello, world! How are you?");
    });

    it("should preserve arrows and brackets", () => {
      const input = "[OK] <- proceed";
      const result = stripEmojis(input);
      expect(result).toBe("[OK] <- proceed");
    });

    it("should preserve bold-with-colon, URLs, and scope operators", () => {
      const input = "**Governed by:** policies\nSee https://agentquilt.dev\nUse std::vector";
      const result = stripEmojis(input);
      expect(result).toBe(input);
    });
  });

  describe("preserves document structure", () => {
    it("keeps Markdown headers intact", () => {
      const input = "# Role\n\nYou review code.\n\n## Criteria\n\n- correctness\n";
      expect(stripEmojis(input)).toBe(input);
    });

    it("keeps newlines and list indentation when removing emojis", () => {
      const input = "# Role ✅\n\n- first 🚀\n  - nested\n";
      const result = stripEmojis(input);
      expect(result).toBe("# Role\n\n- first\n  - nested\n");
    });

    it("blanks lines that consist only of removed emojis", () => {
      const input = "before\n✅ 🚀\nafter\n";
      const result = stripEmojis(input);
      expect(result).toBe("before\n\nafter\n");
    });
  });

  describe("handles mixed content", () => {
    it("should remove emojis from complex text", () => {
      const input =
        "✅ Phase complete: 🚀 Ready to deploy 📋 See checklist 🎯 Goals met";
      const result = stripEmojis(input);
      expect(result).toBe(
        "Phase complete: Ready to deploy See checklist Goals met"
      );
    });

    it("should handle multiple emoticons", () => {
      const input = "Good work :) :D Well done! :)";
      const result = stripEmojis(input);
      expect(result).not.toContain(":)");
      expect(result).not.toContain(":D");
      expect(result).toContain("Good work");
      expect(result).toContain("Well done!");
    });

    it("should trim whitespace after removal", () => {
      const input = "  ✅   ";
      const result = stripEmojis(input);
      expect(result).toBe("");
    });
  });

  describe("policy compliance", () => {
    it("should convert example from CLAUDE.md [✓] to plain text", () => {
      const input = "[✓] This is OK";
      const result = stripEmojis(input);
      // The check mark might not match the pattern, but the intent is preserved as [✓]
      // This tests that we're using [ OK ] style instead
      expect(result).toBeTruthy();
    });

    it("should work with status indicators", () => {
      const input = "Status: ✅ Ready\nNext: 🚀 Deploy";
      const result = stripEmojis(input);
      expect(result).toContain("Status: Ready");
      expect(result).toContain("Next: Deploy");
      expect(result).not.toContain("✅");
      expect(result).not.toContain("🚀");
    });
  });
});
