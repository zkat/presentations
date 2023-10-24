---
marp: true
theme: uncover
class: invert
style: |
  .container {
      display: flex;
  }
  .col {
      flex: 1;
  }
paginate: true
---

# **🦔Gotta Go Fast🏃🏽**

### How to make your users think something broke

_Kat Marchán_

<!--
* Say hi, introduce self
* Talk is going to talk in terms of language PMs but is relevant to system PMs too.
* The point is to knowledge-share, tricks that make users go "wait, did it actually work?"
* Quick heads-up: there's a slide at the end of this talk that involves a lot of motion, so be mindful if you're sensitive to that. I'll give you a heads-up.

Time: 30s
-->

---


## `whoami`

* former NPM CLI architect (JavaScript)
* former member of NuGet team (C#)
* Orogene maintainer (https://orogene.dev) (JS)
* obsessive speed demon 😈

<!--
* 500x speedup for NPM install in some scenarios during the npm5/6 era.

Time: 30s
-->

---

## `whoami`

![w:800](img/benchmarks-warm-cache.png)

<!--
What I mean by that is that I really really like making graphs that look like this.

Orogene is the one at the bottom, there.

Time: 15s
-->

---

## **Stages of Installation**

![w:360](img/stages.png)

<!--

* We're starting by setting some context on what installation typically looks like, at a high level

* These steps will vary depending on whether you do isolated installs for each project, like NPM does, or you do a single-step global install.

* Resolve: This is the resolver. It's what figures out what dependencies you want in your final graph.
* Prune Extraneous: This is the process of looking at previously-installed dependencies and removing any that the newly-calculated graph doesn't need.
* Fetch packages: This is the part where you download a package from your registry, often from your global cache.
* Extract data: is where you actually crack open the package and unpack it, pulling all the files out and putting them somewhere
* Finally, your package manager might need a build or compile step, and it can do it now that everything's installed.

You can squash these together in various ways, but won't necessarily see perf improvement if each step is operating at system capacity. (Example: extracting to destination as soon as a package got resolved did not actually speed Orogene up, and prevented potential tree optimization, but pnpm claims it helped them, so ymmv)

time: 1:50s
-->

---

## **What slows you down**

* Network I/O (usually slowest)
* Dependency resolution (often I/O bound)
* Syscalls (usually I/O)
* Decompressing packages (CPU-heavy)
* Doing things you don't need (design!!)

<!--

* These are the core things to watch out for. (go over each)
  * Network: most often slowest, you have to be mindful that not everyone in the world has gigabit internet like you do.
  * Dependency resolution: depending on package manager constraints, this can be very expensive. For PMs that require "one package, one version" resolution, this is NP-Hard and can get very expensive. In either case, sequential Network I/O has the potential to be the slowest part.
  * Syscalls, most of which are file writes, creating directories, and setting permissions
  * Decompressing packages tends to be very CPU-heavy if you're not already bound by network I/O
  * Doing things you don't need is probably the worst offender of them all. You might assume you need to do things you ultimately don't actually need to do. This all comes down to design, and I think this is the most fun part, to be honest.

* Overall, Package managers mainly I/O bound, but that's not the whole story.
* All optimizations in this talk will be about one of these 5.

Time: 2m
-->

---

## **Measure, measure, measure**

* Split up into diff scenarios
* Use a **variety** of **real** projects!
* Flamegraphs are your friend
* Exploratory spikes! Failure is ok!
* Take notes!

<!--
* Diff scenarios: fully cold start, cold cache, warm cache, lockfile/no lockfile, etc
* Microbenchmarks are useless. Don't try and make up imaginary projects. Use real-world ones. Users will gladly "donate" their manifests to a good cause.
* Flamegraphs: whole topic onto themselves, but great
* Spikes: Always test out your ideas and compare, don't assume an optimization will help. Get comfortable with failure. You can spend weeks on spikes and come up with nothing and that's ok.
* I have literally never really taken notes and I think
that's been to my great detriment.

Time: 2m
-->

---

## **Dependency Graph Algorithms**

* Parallelizing Network I/O is **critical**
* Full SAT/ASP solvers can be very slow
* Ideally off-the-shelf, but nothing good enough
* Honorable mention: PubGrub 🍟

<!--
* Dependency graph resolution is also mostly slowed down by network I/O. Some resolvers can take a long time depending on their constraints and graph size, but there's ways around this so I try not to overindex on this.
* Off-the-shelf SAT solvers tend to be focused around problems where the entire dataset is available locally, so no async work.
* Off-the-shelf SAT solvers also might not support your ecosystem's constraints, or have good enough error reporting.
* PubGrub is a nice algorithm for both speed and error report quality, but needs to be implemented from scratch for every individual PM

Time: 2m
-->

---

## **Stuffing the pipe**

* CPU, local I/O, network I/o
* ~20-50 concurrent network ops ideal (test!)
* If known, start biggest downloads first

<!--
* What I mean by this is making sure that all your resources are getting used at capacity as much as possible. It's about the balance between CPU, local I/O, and network I/O. You can add memory in there if it's a thing you're worried about.
* 20-50 is my own experience. It varies by registry and package manager and network conditions but 20-50 has felt "just right". Test it yourself! Check on your users!

Time: 1m
-->

---

## **Stuffing the pipe**

![w:1100](img/stuff-the-pipe.png)

<!--
I wanted to include a little graph of what I mean, but I think we're all familiar here with the concept of concurrency, so I'm not going to really get into it. Needless to say, doing things sequentially can often be very bad.
-->

<!--
Time: 20s
-->

<!--
"But here's the real kicker..."
-->

---

# ⚠️ `async can be worse` ⚠️

![bg](img/dmitry.png)

<!--
Async can literally make things worse. Involves a lot of overhead when you're not spending enough async time waiting compared to the cycles needed for async execution and context switching.

Time: 20s
-->

---

## **Syscalls**

* Sync wins, hands-down
* Vast majority of files are fairly small
* Spreading them across thread-per-CPU is optimal
* Memoization/caching for `mkdir` ops matters

<!--

Overhead of async context switching usually much higher than just doing things sequentially, but some level of concurrency still good.

Time: 1m
-->

<!--
To give you an idea of how big an impact syscalls make, let's look at some flamegraphs.
-->

---

## **Syscalls (Orogene)**


![w:1000](img/oro-flamegraph.png)

<!--
* Most time spent on clonefileat, a filesystem syscall.
* mkdir is ~5%
* Rest of stuff is async execution, logging, progress bar: generally quality of life overhead that could technically be removed but I don't want to.
* Overall runtime about 1.2s

"But you can take it even further..

Time: 45s
-->

---

## **Syscalls (Bun)**


![w:1000](img/bun-flamegraph.png)

<!--
Here's Bun, on the same project, under the same conditions.

* Basically entirely syscalls
* About 400ms faster.

Time: 20s
-->

---

## **Content-addressable Caching**

* By file hash, not name+version
* Address(es) stored in lockfile or metadata

<!--
Moving on, let's talk CAC.

* Typical caches are package name + package version, which is the quick and naïve way to do it.
* In content addressable caches, on the other hand, file names are the hashes/checksums of the files themselves.

Time: 45s
-->

---

## **Content-addressable Caching**

```
pm-cache/
  sha256/
    ab/
      e3/
        7885aac803db33
      f8/
        ba2112c9f2140c
        256ca5433de3c4
    d2/
      1f/
        936ecb55d7b6fc
```

<!--
This is basically what a content-addressable cache looks like. The filenames themselves are the hashes of the files. It's basically what git does.

File lookup then involves just fetching a desired hash.

* Since you no longer have a name in the cache, you have to figure out other places to store your name and version information and associate it with the hash, such as your lockfile or your package metadata

Time: 1m
-->

---

## **Content-addressable Caching**

* Deduplicate files across versions or packages
* Validate data on install
* Easily avoid case-sensitivity and source repo issues
* Extraction can skip `readdir`

<!--
Here are some of the benefits of content-addressable caching...

* deduplicate: most packages have identical files across versions. You have to measure this for your own scenario, but the level of win is variable.
* validate: dev machine local caches get corrupted. It just happens. Content-addressable caches make it easy to always checksum everything you take out.
* if you're storing things by name and version, you can run into case-sensitivity issues, or you might forget to make sure your cache is also organized by _origin_
* package+name requires filesystem traversal when extracting files. CAC can skip readdir syscalls entirely.

Time: 1m30s
-->

---

## **Content-addressable Server Storage**

* Similar advantages to local caching
* Able to reduce overall downloaded data
  * (if hosted at an individual file level)

<!--
But the client isn't the only place where you can store things by content address. You can do this on the server, too!

* a lot of the client-side benefits apply
* Most interestingly, you would be able to reduce overall downloaded data, if you host packages at an individual file level.

Time: 30s
-->

---

## **Hard Links**

![w:700](img/hard-links.png)

<!--
Next up, let's talk about extraction strategies. The first one is hard links.

Hard links work by making it so multiple files share the same inode. They're available on basically every filesystem and operating system!

Time: 10s
-->

---

## **Hard links**

* No copying needed
* Reduce disk space usage
* Accidental modification is risk
* Slow on macOS (!)

<!--
So, things to note about hard links...

(go over each)

Time: 35s

"But there's an alternative to this that you should also check out..."
-->

---

## **CoW 🐮 (Copy-on-Write)**

* APFS (macOS), ReFS (DevDrive), xfs, btrfs
* aka "reflinking" or "cloning"
* Like hard links, but data gets copied if modified

<!--
"...and that's Copy-on-Write, or CoW."

* Available on..
* Also known as...
* Data automatically copied behind the scenes, efficiently

Time: 50s

"To illustrate this..."
-->

---

### **CoW 🐮 (Copy-on-Write)**

#### With unmodified file:

![w:600](img/cow-before.png)

<!--
"Here's a copy-on-write setup. It's very similar to hard links. Forgive me in advance if this is a bit simplified, by the way, if you know a lot about these systems, I'm just trying to get the point across."

"So again, all three filenames point to the same data when the reflinks are made."
Time: 15s
-->

---

### **CoW 🐮 (Copy-on-Write)**

#### After file modified:

![w:600](img/cow-after.png)

<!--
"...but if one of those files is modified, the modified data is written to _new_ blocks, and the filename will point to those new blocks, instead of the original ones.

This is kind of a fundamental feature of the kinds of filesystems that support this. They also tend to be able to do things like snapshots because of the way they store data.

Time: 30s
-->

---

## **🛌🏽 Do Less 😪**

#### The **fastest** algorithm is always **O(0)**

<!--
Finally, the last section here is about just plain doing less. The fastest algo...

Here's some ideas on how to do _less_, in general.

Time: 15s
-->

---

## **Lockfiles**

* Not just for reproducible builds!
* Skip resolution phase entirely
* Validate packages and their contents
* Content-address-based fetching

<!--
So lockfiles are still all the rage and we all love the reproducible builds they enable, but that's not everything they do.

To me, skipping resolution is the most important part of having a lockfile. It's basically a committed resolution cache!

You can also put some extra metadata in your lockfiles to enable things like data validation

It also lets you do content-address-based fetching of data from either your cache or your registry.

Really useful stuff. I love me a good lockfile. I don't really care what format it's in, but you should always have one.

Time: 50s
-->

---

## **Graph optimization**

* Fewer deps, less work
* Gotta balance w/ calculation cost
* Can be its own phase!

<!--
Next up is graph optimization.

What I mean by this is making it so you have fewer dependencies, if possible. This is probably more of an issue with resolvers like NPM's or Cargo's, where you can end up with several copies of the same package in some worst-case scenarios depending on how your tree looks.

Ultimately, you gotta balance this work with the overall tree calculation cost.

But one cool thing is you can treat is as its own, discrete path in your resolver if you want.

Time: 30s
-->

---

## **"unsafe" mode**

* CI environments tend to be stable
* CI can skip a lot of validation
* Dev envs are chaotic and need more checks
* Example: `npm ci`

<!--
Another thing you could do is have "unsafe" modes for your package manager, enabled either by a flag or by a different command. You can make special, documented assumptions about your environment and remove some safety checks or turn fallbacks and warnings into errors.

I found this works very well for CI-like environments, with relatively predictable setups that have their own validation. Dev environments tend to be a bit more unpredictable, they can collect bitrot or be in strange, surprising states, so it's harder to do this kind of thing there.

You can think of `npm ci` as this kind of thing. If you're unfamiliar, `npm ci` is a special NPM command that's meant to be used when you have a lockfile and no `node_modules` installed. It will skip dependency tree validation and pruning and just go straight into blasting packages into `node_modules` exactly as described in the `package-lock.json`. So, it has a narrow use case, but it's definitely faster!

Time: 1m
-->

---

## **🤔 Do you really need this? 🤔**

#### **Own** your package manager.
#### **You** have the **power** to change it.

<!--
Finally, and this is the hard part: ask yourself if you really need your features. This comes down to a lot of lateral thinking and creativity. It's also the most fun part for me!

I could tell you about specific decisions I've made for specific package managers that have specific constraints, but in order to do this part right, you have to understand your ecosystem, your constraints, and how far from the expected standard workflow your users are willing to go for the sake of blazing speed (hint: farther than you think).

So, I give you permission, right now, to really let yourself go and think outside the box: If you didn't have this one constraint, what could you do? Or more importantly, what could you stop doing entirely? Are you sure people care about it that much? Can you isolate it into a specialized "unsafe" mode?

You know, that kind of thing. Have fun with it!

Time: 1m10s
-->

<!-- And when all else fails...(and here's your motion warning) -->

---

![bg](img/crabrave.gif)
# 🦀 `Rewrite it in Rust` 🦀

---

![bg](img/crabrave.gif)
# 🦀 `Rewrite it in Rust` 🦀

`(kidding)`

---

![bg](img/crabrave.gif)
# 🦀 `Rewrite it in Rust` 🦀

`(kidding (mostly))`

<!--
Time: 10s
-->

---

# **Thanks!**

* https://github.com/zkat
* https://toot.cat/@zkat
* https://orogene.dev
* https://package.community

<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.5.1/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true });
window.addEventListener('vscode.markdown.updateContent', function() { mermaid.init() });
</script>

<!--
Time: 30s
-->
