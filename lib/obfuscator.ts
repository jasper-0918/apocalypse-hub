function encodeStrings(lua: string): string {
  return lua.replace(
    /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'/g,
    (match) => {
      const inner = match.slice(1, -1);
      const bytes = Array.from(inner).map((c) => c.charCodeAt(0));
      return `(function() local s="" local b={${bytes.join(',')}} for i=1,#b do s=s..string.char(b[i]) end return s end)()`;
    }
  );
}

function renameVariables(lua: string): string {
  const varMap: Record<string, string> = {};
  let counter = 0;

  const generateName = () => {
    const chars = 'lIiOo0';
    let name = '_';
    let n = counter++;
    do {
      name += chars[n % chars.length];
      n = Math.floor(n / chars.length);
    } while (n > 0);
    return name;
  };

  return lua
    .replace(/\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, varName) => {
      if (!varMap[varName]) {
        varMap[varName] = generateName();
      }
      return `local ${varMap[varName]}`;
    })
    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
      return varMap[match] || match;
    });
}

function addJunkCode(lua: string): string {
  const junkStatements = [
    `local _junk${Math.random().toString(36).slice(2)} = math.floor(math.random() * 9999)`,
    `local _junk${Math.random().toString(36).slice(2)} = string.rep("x", 0)`,
    `if false then error("unreachable") end`,
  ];
  const junk = junkStatements[Math.floor(Math.random() * junkStatements.length)];
  return `${junk}\n${lua}`;
}

function generateRandomToken(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function wrapInExecutor(lua: string, scriptId: string): string {
  return `
-- Apocalypse Hub | Protected Script [${scriptId}]
-- Do not decompile or redistribute
local _AH = {}
_AH._v = "${generateRandomToken()}"
_AH._t = ${Date.now()}
local function _exec()
${lua}
end
_exec()
`.trim();
}

export function obfuscateLua(lua: string, scriptId: string): string {
  let result = lua;
  result = encodeStrings(result);
  result = addJunkCode(result);
  result = renameVariables(result);
  result = wrapInExecutor(result, scriptId);
  return result;
}

export function generateLoadstringSnippet(scriptId: string, baseUrl: string): string {
  return `loadstring(game:HttpGet("${baseUrl}/api/scripts/serve/${scriptId}?key=YOUR_KEY_HERE"))()`;
}
