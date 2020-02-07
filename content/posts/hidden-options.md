---
title: "Hidden Options for Testing"
date: 2020-01-07T14:24:51+00:00
tags: ["go", "testing", "functional options"]
---

> I am uncertain this is a good idea, but I am experimenting with it.

Before I get into the crux of this post, you should become familiar with a couple useful concepts in Go:

1. Functional options.
2. Using an external test package.
3. Mocking `time.Now` in tests.

The following is a quick recap on all three.

## Functional Options

The first time I learnt about them was through [Functional Options For Friendly APIs][1] by Dave Cheney.
The purpose of the pattern is to aid in the simplification and readability of constructor functions.
This is instead of providing multiple constructors for the same type, or large complex configuration structures for your types.
You can use one constructor definition, which takes a [variadic][2] list of "functional options" (a function which mutates the resulting type).
The constructor should call each option in turn on the type before returning it.

For example:

```go
package main

func main() {
  _ = NewThing()
  _ = NewThing(WithA(3), WithB("some-other-string"))
}

type Thing struct {
  fieldA int
  fieldB string
}

type Option func(*Thing)

func WithA(a int) Option {
  return func(t *Thing) {
    t.fieldA = a
  }
}

func WithB(b string) Option {
  return func(t *Thing) {
    t.fieldB = b
  }
}

func NewThing(opts ...Option) *Thing {
  t := &Thing{fieldA: 5, fieldB: "some-default"}
  for _, opt := range opts {
    opt(t)
  }
  return t
}
```

## Using a Separate Test Package

You can check out a deeper explanation on Segment's blog post advanced testing techniques in Go [here][3]. 
However, the core of this this concept is that you should define the tests for a package in a separate package.
This is to better enforce that the contract being tested is the same contract exposed to other consumers of your package.

For example, given a package called `database` you might have a test go file inside with a name like `database_test.go`.
This pattern suggests that inside your `database_test.go` you should consider not defining your tests with the same `package database` instruction, as the code being tested.
Instead you should try something like suffixing this declaration with `_test` e.g. `package database_test`.

This means that you cannot access any unexported types or fields from the original `database` package.
Forcing your tests to consume the same contract that other external packages consume.
This further ensures that you cannot manipulate the outcome of your tests by reaching inside unexported parts of the package and changing them to suit your assertions.

Personally, I wouldn't prescribe this pattern too dogmatically.
I think it is great when you can do this and is testament to the stability of the contract presented by a package.
However, there are some cases where having access to unexported types makes unit testing a lot easier.
At the end of the day I think we should strive to be as pragmatic as possible.

## Mocking Time

A common scenario I find myself doing in a unit test is mocking the result of `time.Now()`. 

More often than not I do something like this:

> thing.go:

```go
package thing

import "time"

var now = func() time.Time { retun time.Now().UTC() }

// ... use now() instead of `time.Now()` everywhere in the codebase
```

> thing_test.go:

```go
package thing

import "time"

func TestThing(testing.T) {
  // remember original now func
  oldNow := now
  // replace now func with one that always returns a fixed time
  now = func() time.Time {
    return someFixedTime
  }
  // clean up after self
  defer func() {
    now = oldNow
  }()
}
```

Usually I create a local unexported function to use in place of `time.Now()`.
I define it as a variable, such that I can replace it in a test.

The downside is this approach doesn't adhere to the good advice around testing in a separate package.
I would need to export the `Now` variable in order to effectively mock now timestamp generation while testing.
However, this creates a confusing contract for consumers of your type.
It potentially encourages erroneous behaviour to occur by giving consumers the ability to exploit and change the `Now` variable in non-test code.

## Why are you telling me all this?

I want an approach that allows for testing my package externally.
But also one that allows me to be pragmatic and change some small and well-defined dependencies in order to produce deterministic assertions.

### Proposal: Combine local and external packages for a single testing experience

For example, I have a package called `service` which I want to test. Here is how I shall structure my tests:

- I will have define both external and internal package tests (e.g. `service_test.go` and `service_external_test.go`).
- The internal test (`service_test.go`) will be defined in the same package as the thing being tested, but contain no actual test logic. Instead it will define helpers used to override unexported pieces of code (e.g. `Now()`)
- The external test (`service_external_test.go`) will contain all the actual test logic.

What value does this provide?

1. Tests can be easily defined outside of the package.
2. Outside of test compiled binaries (anything not in a `_test.go` filed) cannot access your test specific configuration options.
3. Within a `_test.go` you can provide custom overrides for dependencies that are defined by the package being tested.

### Illustration

```go
// in service.go
package service

type Service struct {
  now func() time.Time
}

type Option func(*Service)

func NewService(opts ...Option) *Service {
  s := &Service{now: time.Now}

  for _, opt := range opts {
    opt(s)
  }

  return s
}

// in service_test.go
package service

func WithNow(now func() time.Time) Option {
  return func(s *Service) {
    s.now = now
  }
}

// in service_external_test.go
func TestService(t *testing.T) {
  fakeNow := func() time.Time {
    return fixedTime
  }

  s := service.NewService(service.WithNow(fakeNow))
}
```

Outside of `_test.go` compiled files `service.WithNow(...)` is not reachable as it won't be compiled into non-test binaries.
Within test compiled code the external packages can access the custom option as it is exported.

[1]: https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis "Functional Options For Friendly APIs"
[2]: https://gobyexample.com/variadic-functions "Variadic Functions in Go"
[3]: https://segment.com/blog/5-advanced-testing-techniques-in-go/#use-a-separate-test-package "Segment Blog: Use A Seperate Test Package"
