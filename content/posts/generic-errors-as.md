---
title: "One-lining errors.As with generics"
date: 2022-11-25T10:35:00+00:00
tags: ["go", "errors", "error-handling", "generics"]
---

I'm sure someone out there has already thought of this. But I stumbled on it when looking at `errors.As` statements in a contribution I was making to [Flipt](https://github.com/flipt-io/flipt).

## TL;DR

This function is handy for brevity and to avoid a potential runtime panic:

```go
func As[E error](err error) (e E, _ bool) {
    return e, errors.As(err, &e)
}
```

## errors.As

If you've ever used the standard-libraries `errors.As` function, you might be familiar with its quirks.

Firstly, you're going to have to explicitly declare a variable and its type on one line.
Only then can you create a pointer to that variable and pass it to `errors.As`.

```go
package main

import "errors"

type MyError string

func (e MyError) Error() string {
    return string(e)
}

func returnsMyError() error {
    return fmt.Errorf("wrapped my error: %w", MyError("my error"))
}

func main() {
    var merr MyError
    if errors.As(returnsMyError(), &merr) {
        fmt.Println("The root of the error was a MyError type:", merr)
    } 
}
```

The program above prints:

```text
The root of the error was a MyError type: my error
```

Note that in `main()` we first define the variable and type we're interested in.
Then on the subsequent line we call `errors.As` and create and pass it a pointer to that variable.

Secondly, there are hazards if your custom error is implemented on a pointer to a type.

```go
type MyError struct {
    Message string
}

func (e *MyError) Error() string {
    return e.String()
}
```

In this situation it can be easy when calling `errors.As` to miss the fact that you need to pass it a `**MyError` (Congrats, you're one step closer to becoming a three-star programmer).
Leading to accidents like the following.

```go
// ...
func returnsMyError() error {
    return &MyError{Message: "my error"}
}

func main() {
    var merr MyError
    if errors.As(returnsMyError(), &merr) {
        fmt.Println("The root of the error was a MyError type:", merr)
    } 
}
```

Which leads to a runtime panic:

```text
panic: errors: *target must be interface or implement error

goroutine 1 [running]:
errors.As({0x4bb008, 0xc000094230}, {0x48d200, 0xc000094220?})
	/go/src/errors/wrap.go:89 +0x3df
```

You must be sure to pass a pointer to an error implementation.

```go
func main() {
    var merr *MyError // *MyError is the error implementation not MyError
    if errors.As(returnsMyError(), &merr) {
        fmt.Println("The root of the error was a MyError type:", merr)
    } 
}
```

## Solution

Generics (introduced in Go 1.18) provide a handy way to one-line `errors.As` and it provides compile-time safety to avoid this panic.

All you need is this handful of lines:

```go
import "errors"

// ...

func As[E error](err error) (e E, _ bool) {
    return e, errors.As(err, &e)
}
```

With this you can one-line the declaration and assertion like so:

```go
// ...

func main() {
	if merr, match := As[MyError](returnsMyError()); match {
		fmt.Println("The root of the error was a MyError type:", merr)
	}
}
```

1. No more pesky variable declaration required before the conditional.
2. If your type implements `Error()` over a pointer you can't mistakenly attempt to call `As` with the non-pointer type.

See the what the following attempt to make the mistake in (2) does:

```go
package main

import (
	"errors"
	"fmt"
)

func As[E error](err error) (e E, _ bool) {
	return e, errors.As(err, &e)
}

type MyError string

// Error() is implemented over a *MyError (pointer to MyError)
func (e *MyError) Error() string {
	return string(*e)
}

func returnsMyErrorPointer() error {
	err := MyError("my errors")
	return &err
}

func main() {
	if merr, match := As[MyError](returnsMyErrorPointer()); match {
		fmt.Println("The root of the error was a MyError type:", merr)
	}
}
```

This program actually fails at compile time with:

```text
./prog.go:24:23: MyError does not implement error (Error method has pointer receiver)
```

Removing the runtime panic situation altogether.

## Final Thoughts

This is not a perfect solution. There still exists one particular trap.
It is a trap that exists in the standard library `errors.As` too.

When you don't accept a pointer to a type when implementing `Error()` then the compiler will accept that `*YourErrorType` implements `error` still.
Because a method on non-pointer type can be called on a pointer to it.
The pointer is just dereferenced before invoking the function (`Error()` in this case).
So one final subtle easy to make mistake remains.

```go
type MyError string

func (e MyError) Error() string {
    return string(e)
}

func returnsMyErrorPointer() error {
    err := MyError("my errors")
    return &err
}

func main() {
	if merr, match := As[MyError](returnsMyErrorPointer()); match {
		fmt.Println("The root of the error was a MyError type:", merr)
        return
	}

    fmt.Println("Does not match")
}
```

This compiles and prints `Does not match`. Because it is `*MyError` which is returned, and not `MyError`. This is an easy mistake to make. Sadly I think this is unavoidable.
