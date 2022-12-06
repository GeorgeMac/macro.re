import { MDXProvider } from '@mdx-js/react'

const sizes = [
  'text-3xl',
  'text-2xl',
  'text-xl',
  'text-lg',
  'text-md',
]

const Heading = function(n) {
  const HeadTag = `h${n}`
  const cls = `${sizes[n-1]} py-6`
  return (props) => (
    <HeadTag className={cls} {...props}>{props.children}</HeadTag>
  )
}

const A = (props) => (
  <a className="underline underline-offset-8 decoration-wavy hover:decoration-pink-400/60" {...props}>{props.children}</a>
)

const BlockQuote = (props) => (
  <blockquote className="italic p-4" {...props}>{props.children}</blockquote>
)

const OrderedList = (props) => (
  <ol className="list-decimal list-inside p-4" {...props}>{props.children}</ol>
)

const P = (props) => (
  <p className="mb-4" {...props}>{props.children}</p>
)

const Pre = (props) => (
  <pre className="mb-4 bg-pink-100/70 p-4 rounded-md max-w-6xl" {...props}>{props.children}</pre>
)

const Code = (props) => (
  <code {...props}>{props.children}</code>
)

const components = {
  a: A,
  p: P,
  h1: Heading(1),
  h2: Heading(2),
  h3: Heading(3),
  h4: Heading(4),
  h5: Heading(5),
  blockquote: BlockQuote,
  ol: OrderedList,
  pre: Pre,
  code: Code,
}

export function BlogLayout({ children }) {
  return (
    <>
      <MDXProvider components={components}>
        {children}
      </MDXProvider>
    </>
  )
}
