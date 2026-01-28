# Supported Programming Languages

The Codehub Live Coding Platform now supports **34 programming languages** through the OneCompiler API via RapidAPI.

## Full Language List

### Popular Languages
- **JavaScript** - Browser-side JavaScript
- **Node.js** - Server-side JavaScript runtime
- **TypeScript** - Typed JavaScript
- **Python** - Python 3.x
- **Python 2** - Legacy Python 2.x
- **Java** - Object-oriented programming
- **C** - Low-level systems programming
- **C++** - Object-oriented C
- **C#** - .NET framework language

### Modern Languages
- **Go** - Google's systems language
- **Rust** - Memory-safe systems language
- **Kotlin** - Modern JVM language
- **Swift** - Apple's iOS/macOS language
- **Dart** - Flutter/web language
- **Scala** - Functional JVM language

### Scripting Languages
- **PHP** - Server-side web scripting
- **Ruby** - Dynamic web language
- **Perl** - Text processing language
- **Lua** - Lightweight scripting
- **Bash** - Unix shell scripting
- **Shell** - Generic shell scripts

### Functional Languages
- **Haskell** - Pure functional programming
- **Elixir** - Functional concurrent language
- **Erlang** - Distributed systems language
- **Clojure** - Lisp for the JVM
- **F#** - Functional .NET language

### Statistical & Specialized
- **R** - Statistical computing
- **Groovy** - Dynamic JVM language
- **Objective-C** - Apple legacy language

### Legacy & Systems
- **Assembly** - Low-level machine code
- **Fortran** - Scientific computing
- **COBOL** - Business applications
- **Pascal** - Educational/systems language

## Features Per Language

Each language includes:
- ✅ **Monaco Editor** syntax highlighting
- ✅ **Default "Hello, World!"** code template
- ✅ **stdin input** support for interactive programs
- ✅ **Real-time execution** via OneCompiler API
- ✅ **stdout/stderr** output capture
- ✅ **Execution time** and **memory usage** metrics
- ✅ **Error handling** with compilation/runtime error detection

## API Integration

All languages are executed via:
- **OneCompiler APIs** (RapidAPI)
- Endpoint: `https://onecompiler-apis.p.rapidapi.com/api/v1/run`
- Authentication: RapidAPI Key (configured in `.env`)

### Required Environment Variables

```bash
ONE_COMPILER_KEY=your_rapidapi_key_here
ONE_COMPILER_HOST=onecompiler-apis.p.rapidapi.com
ONE_COMPILER_URL=https://onecompiler-apis.p.rapidapi.com/api/v1/run
```

## Language Configuration

Language mappings and file extensions are configured in:
- **Types**: `src/components/LiveCodePlayground/types.ts`
- **API Route**: `src/app/api/execute/route.ts`

## Adding More Languages

To add additional languages:

1. Add to `SUPPORTED_LANGUAGES` array in `types.ts`:
```typescript
{
  id: 'newlang',
  name: 'New Language',
  monacoLanguage: 'newlang',
  extension: '.nl',
  defaultCode: '// Your default code here',
}
```

2. Add mappings in `route.ts`:
```typescript
const LANGUAGE_MAP: Record<string, string> = {
  // ...
  newlang: 'onecompiler_language_id',
}

const FILE_NAMES: Record<string, string> = {
  // ...
  newlang: 'main.nl',
}
```

3. Verify OneCompiler supports the language at: https://onecompiler.com/

## Future Enhancements

- [ ] Database support (SQL, MongoDB, PostgreSQL, etc.)
- [ ] Web frameworks (React, Vue, Angular with live preview)
- [ ] Package/library installation support
- [ ] Multi-file project support
- [ ] Custom compiler flags
- [ ] Language-specific linting/formatting

## Testing

To test a language:
1. Navigate to `/Live/demo-lecture`
2. Select the language from the dropdown
3. Write/modify code in the Monaco Editor
4. Click "Run" or press `Ctrl+Enter`
5. View output in the Output panel

---

**Last Updated**: January 27, 2026
**OneCompiler API Version**: v1
**Total Languages**: 34

