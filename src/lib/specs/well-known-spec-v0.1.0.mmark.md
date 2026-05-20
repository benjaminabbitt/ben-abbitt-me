%%%
title = "well-known-spec: A Convention for Publishing Versioned Specifications under /.well-known/spec/"
abbrev = "well-known-spec"
docname = "well-known-spec-v0.1.0"
category = "info"
ipr = "none"
area = "General"
submissionType = "independent"
date = 2026-05-20T00:00:00Z

[seriesInfo]
name = "Internet-Draft"
value = "well-known-spec-v0.1.0"
status = "informational"
stream = "independent"

[[author]]
initials = "B."
surname = "Abbitt"
fullname = "Ben Abbitt"
[author.address]
email = "ben+spec@abbitt.me"
uri = "https://ben.abbitt.me/"
%%%

.# Abstract

There is no widely-adopted convention for publishing versioned specifications on a website. OpenAPI documents live wherever the publisher feels like; JSON Schemas live wherever the $id says; community conventions live in blog posts or GitHub READMEs, sometimes with version-pinned URLs and sometimes not. This document proposes a small, opt-in, format-agnostic convention: publish versioned specifications at /.well-known/spec/{name}/v{x.y.z}.{ext}, where {ext} matches the served Content-Type. References to a spec MUST pin to a specific version. This document is itself published per the convention it describes.

{mainmatter}

# Introduction

When OpenAPI publishers want consumers to find their specification documents at a predictable URL, they reinvent the choice: /openapi.json, /api-docs, /swagger.json, /.well-known/openapi, /v1/openapi.json. The OpenAPI community has been discussing a standard well-known location since 2019 (see OpenAPI issue #1851) without resolution. When a community spec like Semantic Versioning has a stable URL, it lives on a project-specific domain (semver.org) without a generalizable convention for any other community spec to follow. When IETF drafts about HTTP versioning (the expired draft-nottingham-http-over-version, the expired draft-claise-semver) need permanent URLs, they get them from the IETF datatracker, but only after the months-long Internet-Draft process.

What is missing is a casual, low-ceremony pattern for any individual or small project to publish a versioned spec at a URL that:

* Identifies the host that publishes it (different hosts may publish different specs of the same name).
* Identifies the spec name unambiguously.
* Identifies the exact version of the spec, immutable and stable.
* Is discoverable by convention without registration.
* Functions as a draft community standard with a clear path toward formal IETF/IANA standardization as adoption justifies.

This document proposes such a pattern: /.well-known/spec/{name}/v{x.y.z}.{ext} is the canonical URL, and the only URL. The choice of /.well-known/ is grounded in [@!RFC8615], which reserves the path prefix for site-wide metadata. No new IANA registration is required immediately, because the spec documents are leaf files under /.well-known/, not new well-known URI suffixes (registration of the "spec" suffix is suggested as future work; see [@iana-considerations]).

The convention is format-agnostic. A spec document MAY be a JSON Schema, an OpenAPI document, a Markdown file, an HTML page, an ABNF grammar, plain text, or anything else textual addressable as a single file at the canonical URL. The convention is about where specs live and how they are versioned, not what they look like inside. Companion specs MAY define format-specific structural requirements; well-known-spec itself does not.

# Conventions and Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [@!RFC2119] [@!RFC8174] when, and only when, they appear in all capitals, as shown here, and only as constraints on spec documents that opt in to this convention. Nothing in this document requires any host to publish a spec.

The term "spec document" refers to any file published at a /.well-known/spec/... URL as defined by this convention. A spec document MAY be in any format (see [@spec-document-format]); this convention does not require any particular format.

The term "canonical versioned URL" refers to a URL of the form /.well-known/spec/{name}/v{x.y.z}.{ext} -- the only URL form this convention defines.

# Optionality and Scope

This convention is opt-in. Specifically:

* A host is NOT REQUIRED to publish any spec documents. The absence of /.well-known/spec/* is conformant.
* A host that publishes a spec document is NOT REQUIRED to publish other versions of the same spec.
* A host that publishes multiple specs MAY publish them in any subset of the namespaces under /.well-known/spec/.

The convention's MUST and SHOULD language applies only to documents that exist. Hosts publishing nothing are conformant. Documents published at /.well-known/spec/{name}/v{x.y.z}.{ext} MUST follow [@spec-document-format].

This convention is unrelated to whether the thing a spec describes (a manifest format, a header, a protocol) is opt-in. That is the individual spec's concern. This convention concerns only where and how spec documents themselves are published.

# URL Convention

## Canonical Versioned URL

A conforming spec document for a spec named {name} at version {x.y.z} MUST be served at:

    https://{host}/.well-known/spec/{name}/v{x.y.z}.{ext}

where:

* {host} is the publishing origin (scheme, host, and optional port per [@!RFC6454]).
* {name} is the spec name. It MUST match the pattern `^[a-z][a-z0-9-]*$` (lowercase kebab-case, starting with a letter).
* {x.y.z} is the spec version, a Semantic Versioning 2.0.0 string. The leading "v" is REQUIRED. Pre-release suffixes are valid: v1.0.1-DRAFT-1, v2.0.0-rc.1, v0.2.0-alpha.3. Build metadata (the "+meta" suffix) uses "+" which is reserved in URL paths per [@!RFC3986] and SHOULD be omitted from canonical URLs; encode the equivalent information in the pre-release identifier or in the document body instead.
* {ext} is the file extension matching the document's served Content-Type (see [@file-extension-and-content-type]).

The canonical URL MUST be served with a Content-Type appropriate to the document's format.

The canonical URL is immutable. Once published at a given version, the content at that URL MUST NOT change. There are no editorial-change exceptions: typo fixes, clarifications, and any other modification to the document, however small, require a new PATCH version bump (or higher if the change is normative). Consumers MUST be able to rely on the URL identifying a fixed byte sequence; pinning to a version means pinning to its exact content.

Consumers MAY compute and record a cryptographic hash of any spec document they fetch and pin to; doing so is RECOMMENDED. The hash algorithm SHOULD be SHA-256. If a subsequent fetch of the same canonical URL yields a document whose hash differs, the publisher has violated the immutability rule of this section; the consumer SHOULD treat the divergence as a contract breach, report it to the publisher, and treat the new content as a distinct document not covered by their original pin. Consumer-side hashing provides tamper-evidence without requiring any publisher-side hash publication.

## Cache-Control

The canonical versioned URL SHOULD be served with a long `Cache-Control` `max-age`; the content is immutable. RECOMMENDED: `Cache-Control: public, max-age=31536000, immutable` (one year, immutable).

## Hash Sidecar (Optional)

A publisher MAY publish a SHA-256 hash sidecar alongside a spec document, following the Apache-style sidecar convention widely used by package mirrors (Maven, PyPI mirrors, Apache release archives). The sidecar URL is the spec URL with `.sha256` appended:

    /.well-known/spec/{name}/v{x.y.z}.{ext}.sha256

The sidecar's content MUST be the hex-encoded SHA-256 digest of the spec document, optionally followed by whitespace and the filename, matching the output format of sha256sum:

    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  v0.1.0.txt

Other digest algorithms MAY be published using the corresponding suffix (.sha512, .sha1, etc.). SHA-256 is RECOMMENDED. There is no formal RFC standardizing this sidecar convention; this section codifies the prevailing practice from the Apache/Maven/PyPI ecosystem for use within well-known-spec.

The sidecar is itself subject to [@canonical-versioned-url] immutability -- once published at its canonical URL, its content MUST NOT change.

Consumer behavior: a consumer fetching a spec document SHOULD also fetch the sidecar (if present) and verify that the digest of the fetched spec matches the sidecar's digest BEFORE storing or trusting the spec. If the digests do not match, the consumer SHOULD treat the fetch as failed, the spec content as untrusted, and discard it; the consumer MUST NOT cache, validate against, or otherwise rely on the unverified content.

A missing sidecar is not an error -- sidecars are optional. Consumers MAY proceed without verification if no sidecar is published, but SHOULD compute their own hash on first fetch and record it for future re-fetch comparison.

The sidecar establishes integrity at fetch time. The consumer-hash record (see [@canonical-versioned-url]) detects subsequent silent modification by the publisher. The two are complementary; neither replaces the other.

Note that a hash sidecar protects against transit-level corruption (CDN errors, intermediary mutation) and accidental publisher mistakes, but cannot detect deliberate tampering by a publisher who controls both the spec and its sidecar. Cryptographic signatures (out of scope for this version) would be needed for that threat model.

## Multiple Formats at the Same Version

Different file extensions of the same spec -- at the same {name} and same {x.y.z} -- MAY coexist as separate canonical URLs. A publisher MAY publish, simultaneously:

    /.well-known/spec/foo/v0.1.0.md       (RFC-style Markdown narrative, with reasoning)
    /.well-known/spec/foo/v0.1.0.txt      (pixel-perfect IETF plain text)
    /.well-known/spec/foo/v0.1.0.proto    (Protobuf source - pure IDL, no prose)
    /.well-known/spec/foo/v0.1.0.html     (rendered web view, possibly with styling)

The byte contents at these URLs MAY differ. The Markdown may carry narrative, examples, and rationale; the .proto may be pure source; the .html may add headers, styling, and navigation. Each URL is independently fetchable and independently immutable. Consumers MAY use whichever format best suits their use case.

Cross-format consistency (normative): documents at the same {name} and same {x.y.z} MUST describe the same thing. They are not independent specs that happen to share a base name; they are different presentations of one spec. A publisher who publishes both /.well-known/spec/foo/v0.1.0.md and /.well-known/spec/foo/v0.1.0.proto represents both as "foo v0.1.0", and the normative content (rules, data shape, structural requirements) MUST agree between them. Where the formats differ -- narrative prose present in one and absent in another, machine-checkable schema present in one and not in another -- the differences MUST be additions or presentational choices, never contradictions.

If a publisher needs the content to differ semantically -- if the .proto actually describes a different version of the data shape than the .md narrative -- they MUST use a different version identifier on at least one of them. Two semantically-different documents at the same name+version is a contract violation, on the same footing as mutating the content of a canonical URL.

This rule is what makes the multi-format flexibility safe. A consumer who pins to "foo v0.1.0" can switch between .md, .txt, .proto, and .html and rely on getting the same spec, in different forms.

# Spec Document Format

This convention is about URL location and versioning, not document format. A spec document MAY be in any format addressable as a single file at the canonical URL.

## Choosing a Format

A spec SHOULD use an existing specification format when one is established for the use case the spec describes. The format choice follows the shape of the thing being specified.

For specs that describe data shapes, message structures, or service surfaces, format-specific specification languages already exist and SHOULD be used:

* gRPC services and Protocol Buffer messages -- define them in Protobuf .proto files. The Protobuf IDL is a text format covering both message shape and RPC service surfaces; it has broad tooling, language support, and a stable canonical syntax. For any specification that ultimately compiles to a Protobuf-described wire format, .proto is the right artifact.
* JSON data shape -- use JSON Schema.
* HTTP API surfaces (request/response shapes, routes, parameters) -- use OpenAPI.
* XML data shape -- use XSD or RELAX NG.
* Avro records -- use the Avro schema language (.avsc).
* GraphQL schemas -- use the GraphQL Schema Definition Language (.graphql).
* Linked-data shapes -- use SHACL or RDF Schema.

For specs that are more abstract -- a protocol, a naming convention, a grammar, an algorithm, an architectural pattern, a process -- text-based formats are appropriate. ABNF [@!RFC5234] for grammar; Markdown, HTML, or plain text for narrative. This document (well-known-spec) is in this category, and is itself published as pixel-perfect IETF plain text (this .txt) and as RFC-style Markdown (the parallel .md) -- both presenting the same normative content per [@multiple-formats-at-the-same-version].

Specifications using complex binary formats for the spec document itself -- PDF, CBOR, MessagePack, custom binary protocols, word-processor formats, etc. -- are NOT RECOMMENDED. Specs are read by humans and by tooling alike; binary formats hurt both. PDF in particular is sometimes mistaken for a "text" format because it carries text content, but it is a complex binary container and hostile to inspection, diff, and version-control review; treat it as binary. Use a textual format for the spec document, even when the data the spec describes is binary -- Protobuf's .proto is text describing binary messages, and that is the right shape. A binary spec document raises the cost of inspection, diff, code review, and porting between hosts without offering compensating benefits.

The convention does not enforce these choices. A publisher MAY use any format they prefer; the SHOULD reflects practical advice for adoption, tooling support, and readability.

## File Extension and Content-Type

The {ext} segment of the canonical URL MUST match the served Content-Type. Common pairings:

| Format         | Extension | Content-Type                              |
| -------------- | --------- | ----------------------------------------- |
| JSON Schema    | .json     | application/schema+json (RECOMMENDED)     |
| JSON (other)   | .json     | application/json                          |
| OpenAPI (YAML) | .yaml     | application/yaml                          |
| OpenAPI (JSON) | .json     | application/json                          |
| Markdown       | .md       | text/markdown                             |
| HTML           | .html     | text/html                                 |
| Plain text     | .txt      | text/plain                                |
| ABNF / grammar | .abnf     | text/plain                                |

The table is illustrative. Any IANA-registered media type and corresponding well-known file extension MAY be used.

## Identity Declaration

A spec document SHOULD declare its identity (name, version, canonical URL) in a format-appropriate way, so that consumers fetching the document by other means (local cache, mirror, forked copy) can identify it without relying on its filesystem location.

Examples:

* JSON Schema -- the $id field carries the canonical URL; title carries the name and version.
* OpenAPI -- info.title and info.version; canonical URL via an extension field like info.x-canonical-url (no standard field exists for this).
* Markdown -- YAML front-matter with name, version, canonical_url keys; or the first heading.
* HTML -- `<link rel="canonical" href="...">`, `<title>`, and a meta tag for the version.

This is a SHOULD, not a MUST. The canonical URL is always the URL itself, regardless of whether the document internally references it.

## Companion Format-Specific Specs

A separate spec MAY define additional structural requirements for documents in a particular format. For example, a hypothetical well-known-spec-json-schema companion could require JSON Schema documents to carry $schema, $id, and title (rules applicable specifically to JSON Schemas published under well-known-spec). A well-known-spec-openapi companion could require specific info fields. Such companion specs are out of scope for well-known-spec v0.1.0; they may be developed independently and referenced from the documents they constrain.

## What This Convention Does Not Require

A conforming spec document is NOT REQUIRED to:

* Use any particular document format.
* Carry custom metadata fields beyond what its format naturally supports.
* Conform to any companion format-specific spec.
* Reference a particular IANA registration.
* Declare a license (though publishers SHOULD declare one in a narrative companion document).

The status (draft / stable / deprecated) is implicit in the semver of the canonical URL. Two distinct signals indicate draft-ness, either of which is sufficient:

* MAJOR version 0 (0.x.y) is draft by semver convention: anything MAY change in the next 0.x.y release.
* A semver pre-release suffix indicates the document is a pre-release of the version it qualifies, regardless of MAJOR. v1.0.1-DRAFT-1 is draft 1 of v1.0.1; subsequent drafts of the same target version are v1.0.1-DRAFT-2, v1.0.1-DRAFT-3, etc. When v1.0.1 is published without a suffix, it is the stable release of that version and the preceding -DRAFT-N drafts are superseded. Conventional pre-release identifiers (-alpha.1, -beta.2, -rc.1) work the same way.

Both signals indicate draft-ness. A version like v0.2.0-DRAFT-1 is draft on two counts (MAJOR 0 AND pre-release suffix); both are normative draft indicators.

A version with neither MAJOR 0 nor a pre-release suffix (e.g. v1.0.0, v2.3.1) is a stable release.

Deprecation is communicated by publishing a new MAJOR version and by out-of-band announcement (release notes, changelog).

The deliberate minimalism reflects that the value of well-known-spec is in the URL convention and the versioning rules, both of which are useful independent of how the spec content is encoded.

# Validation

This convention does not standardize validation tooling. Whether a spec document is machine-validatable depends entirely on its format:

* JSON Schema documents can be validated using any JSON Schema validator (ajv, Python jsonschema, etc.).
* OpenAPI documents can be validated using OpenAPI validators (openapi-spec-validator, Spectral, etc.).
* Protobuf .proto files can be parsed and type-checked by protoc and language SDKs.
* XSD, RELAX NG, Avro, GraphQL SDL, SHACL -- each has its own validators.
* Markdown, HTML, plain text, and other narrative formats have no standard machine validation; they are validated by reading.

Companion specs (see [@companion-format-specific-specs]) MAY provide additional structural constraints for specific formats and accompanying validators. None are required by this convention.

This document, well-known-spec v0.1.0, is itself in IETF plain text and RFC-style Markdown (see [@choosing-a-format]) and has no machine validator. The only properties this convention enforces on a spec document are that it is reachable at its canonical URL and immutable. Consumers needing integrity assurance beyond reachability MAY use consumer-side hashing or rely on a publisher-side hash sidecar if published.

Multiple hosts MAY publish their own copies of well-known-spec or any other spec. Hosts SHOULD use the same content for the same version; this is by convention, not by enforcement.

# Versioning of This Spec

This spec is itself versioned per Semantic Versioning 2.0.0.

* MAJOR version bumps signal changes that invalidate existing spec documents -- for instance, removing a required field, repurposing a field name, or changing the meaning of a required field.
* MINOR version bumps signal additions that do not invalidate existing spec documents -- for instance, allowing additional JSON Schema dialects, adding OPTIONAL fields.
* PATCH version bumps signal clarifications and typo fixes with no normative change.

A spec document MAY identify the version of well-known-spec it conforms to in its description (or other format-appropriate field). There is no required field for this; consumers can verify conformance against any version of well-known-spec they consider appropriate.

# Security Considerations

The security surface of this convention is small.

Publishing spec documents at predictable URLs is a discoverability feature, not a security concern. The spec documents themselves carry no operational data -- they describe formats, protocols, or conventions, but do not contain credentials, user data, or runtime state. A consumer fetching a spec URL learns that this host publishes the named convention; whether they fetch any corresponding manifest, deploy a server, or expose API endpoints is a separate question with separate security considerations.

Hosts publishing spec documents MUST ensure those documents are immutable at their canonical versioned URL. A host that publishes content at /.well-known/spec/{name}/v0.1.0.{ext} and later silently replaces it with different content has broken the contract that pinned references depend on. Such a host harms consumers who pinned to the URL.

Cross-host references to spec documents may be subject to TLS, DNS, and routing trust. Consumers validating against a spec document at a remote URL SHOULD use HTTPS. Every reference under this convention pins to a specific version (the canonical versioned URL), which is the right default for reproducible validation.

# Discoverability

This convention is discoverable in the way [@RFC8615] intends. A consumer aware of well-known-spec and the name of a spec they want can:

1. Probe `https://{host}/.well-known/spec/{name}/v{x.y.z}.{ext}` for a specific version (with the extension the publisher uses for that spec's format).
2. Receive a 404 if the host has not published that version of the spec.

The 404 is informative. It says "this host does not publish this spec," and the consumer can proceed accordingly.

This convention does NOT specify a discovery endpoint listing all specs a host publishes. A host that wants to advertise its full spec catalog MAY publish a manifest at /.well-known/specs.json or some similar location, but the format and existence of such a manifest are out of scope for this version of well-known-spec. Future versions MAY add this.

Crawlers and search engines generally do not index /.well-known/ paths by default. Hosts that want their spec documents to be discoverable to general search MAY explicitly link them from publicly-indexable pages.

# IANA Considerations

This convention, as currently published, is not fully conformant with [@!RFC8615]'s registration requirements. RFC 8615 Section 3 requires that any name used as a well-known URI suffix MUST be registered with IANA via the Expert Review process. The "spec" suffix used by this convention is unregistered.

This places the convention in the same category as a substantial fraction of /.well-known/ usage in the wild: practical, recognizable, technically unregistered. Provisional registration of "spec" as a well-known URI suffix is suggested as future work and would not require advancement to RFC status.

The convention treats the segment immediately after "spec" (the spec name, e.g. "deployment-version") as a sub-path under the registered suffix, not as its own registered suffix. RFC 8615's ABNF allows multi-segment URLs under a registered prefix (existing precedent: /.well-known/acme-challenge/{token} from [@RFC8555]). Registration of "spec" would therefore suffice for any number of specs published under it.

Adopters concerned about strict RFC 8615 conformance SHOULD await registration; alternatively they MAY deploy a host-specific variant under a known-conformant suffix.

The application/json, application/schema+json, text/markdown, text/plain, and other media types referenced by this convention are used unchanged. The convention does not define a new media type.

# Reference Implementation

The publishing host ben.abbitt.me is a working implementation of well-known-spec v0.1.0. The live artifacts on that host demonstrate multi-format coexistence (see [@multiple-formats-at-the-same-version]):

* IETF plain text: https://ben.abbitt.me/.well-known/spec/well-known-spec/v0.1.0.txt -- this document, generated via mmark and xml2rfc from a kramdown-rfc source.
* RFC-style Markdown: https://ben.abbitt.me/.well-known/spec/well-known-spec/v0.1.0.md -- the same normative content in Markdown.
* HTML narrative companion: https://ben.abbitt.me/posts/well-known-spec/ -- rendered via the site's Astro layout.

All three URLs serve the same normative content as required by [@multiple-formats-at-the-same-version]. Differences are presentational only.

A separate spec (deployment-version) is published under the same convention at /.well-known/spec/deployment-version/v0.1.0.json. That spec describes a JSON manifest shape and is correctly published as a JSON Schema per [@choosing-a-format].

{backmatter}

<reference anchor="RFC2119" target="https://datatracker.ietf.org/doc/html/rfc2119">
  <front>
    <title>Key words for use in RFCs to Indicate Requirement Levels</title>
    <author initials="S." surname="Bradner" fullname="Scott Bradner"/>
    <date year="1997" month="March"/>
  </front>
  <seriesInfo name="BCP" value="14"/>
  <seriesInfo name="RFC" value="2119"/>
</reference>

<reference anchor="RFC3986" target="https://datatracker.ietf.org/doc/html/rfc3986">
  <front>
    <title>Uniform Resource Identifier (URI): Generic Syntax</title>
    <author initials="T." surname="Berners-Lee" fullname="Tim Berners-Lee"/>
    <author initials="R." surname="Fielding" fullname="Roy T. Fielding"/>
    <author initials="L." surname="Masinter" fullname="Larry Masinter"/>
    <date year="2005" month="January"/>
  </front>
  <seriesInfo name="STD" value="66"/>
  <seriesInfo name="RFC" value="3986"/>
</reference>

<reference anchor="RFC5234" target="https://datatracker.ietf.org/doc/html/rfc5234">
  <front>
    <title>Augmented BNF for Syntax Specifications: ABNF</title>
    <author initials="D." surname="Crocker" fullname="Dave Crocker" role="editor"/>
    <author initials="P." surname="Overell" fullname="Paul Overell"/>
    <date year="2008" month="January"/>
  </front>
  <seriesInfo name="STD" value="68"/>
  <seriesInfo name="RFC" value="5234"/>
</reference>

<reference anchor="RFC6454" target="https://datatracker.ietf.org/doc/html/rfc6454">
  <front>
    <title>The Web Origin Concept</title>
    <author initials="A." surname="Barth" fullname="Adam Barth"/>
    <date year="2011" month="December"/>
  </front>
  <seriesInfo name="RFC" value="6454"/>
</reference>

<reference anchor="RFC8174" target="https://datatracker.ietf.org/doc/html/rfc8174">
  <front>
    <title>Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words</title>
    <author initials="B." surname="Leiba" fullname="Barry Leiba"/>
    <date year="2017" month="May"/>
  </front>
  <seriesInfo name="BCP" value="14"/>
  <seriesInfo name="RFC" value="8174"/>
</reference>

<reference anchor="RFC8555" target="https://datatracker.ietf.org/doc/html/rfc8555">
  <front>
    <title>Automatic Certificate Management Environment (ACME)</title>
    <author initials="R." surname="Barnes" fullname="Richard Barnes"/>
    <author initials="J." surname="Hoffman-Andrews" fullname="Jacob Hoffman-Andrews"/>
    <author initials="D." surname="McCarney" fullname="Daniel McCarney"/>
    <author initials="J." surname="Kasten" fullname="James Kasten"/>
    <date year="2019" month="March"/>
  </front>
  <seriesInfo name="RFC" value="8555"/>
</reference>

<reference anchor="RFC8615" target="https://datatracker.ietf.org/doc/html/rfc8615">
  <front>
    <title>Well-Known Uniform Resource Identifiers (URIs)</title>
    <author initials="M." surname="Nottingham" fullname="Mark Nottingham"/>
    <date year="2019" month="May"/>
  </front>
  <seriesInfo name="RFC" value="8615"/>
</reference>

# Example Spec Document

The deployment-version v0.1.0 spec document, conformant to this convention, is published as a JSON Schema at:

    https://ben.abbitt.me/.well-known/spec/deployment-version/v0.1.0.json

The narrative companion is at https://ben.abbitt.me/posts/deployment-version/.

# Implementation Patterns

## Astro static endpoint

The current site's reference implementation serves the canonical IETF text via an Astro endpoint that fetches a pre-generated text file (produced offline via mmark + xml2rfc) and serves it with text/plain Content-Type and a one-year immutable Cache-Control header. The endpoint source is at src/pages/.well-known/spec/well-known-spec/v0.1.0.txt.ts in the publisher's repository.

The parallel Markdown URL is served by an analogous endpoint that returns the post body raw as text/markdown.

## nginx static

    location /.well-known/spec/my-spec/v0.1.0.txt {
      add_header Content-Type "text/plain";
      add_header Cache-Control "public, max-age=31536000, immutable";
      alias /var/www/specs/my-spec-v0.1.0.txt;
    }

## GitHub Pages and other static hosts

GitHub Pages does not allow custom Content-Type or Cache-Control headers. Static spec files are served with the default Content-Type (derived from the file extension) and GitHub's default cache behavior. The convention is satisfied; the headers are degraded.

A site can place a file directly at:

    public/.well-known/spec/my-spec/v0.1.0.txt

and it will be served at the corresponding URL.

# Change Log

* v0.1.0 (2026-05-20) -- Initial draft.
