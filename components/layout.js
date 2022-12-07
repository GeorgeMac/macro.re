import Head from 'next/head'
import {
  faMastodon,
  faTwitter,
  faGithub,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const A = (props) => {
  const className = `${props.className} underline underline-offset-8 decoration-wavy hover:decoration-pink-400/60`
  return <a {...props} className={className}>{props.children}</a>
}

export default function Layout({ children }) {
  return (
    <>
      <div className="bg-lime-50 font-sans">
        <Head>
          <title>GeorgeMac</title>
          <meta name="description" content="Personal site for George MacRorie" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/base16/github.min.css" />
        </Head>

        <main className="container mx-auto flex flex-col justify-left p-10 max-w-6xl">
          <div className="flex-row pb-8">
            <h1 className="text-left text-4xl">
              <a href="/">
                GeorgeMac<span className="text-black/60 underline underline-offset-8 decoration-wavy decoration-pink-400/60">Rorie</span>
              </a>
            </h1>
          </div>
          <nav className="flex justify-between pb-8">
            <div>
            {
              [
                {dest: '/posts', content: 'blog'},
              ].map((link) => (
              <A className="mr-3" key={link.dest} href={link.dest}>{link.content}</A>
              ))
            }
            </div>
            <div>
              <A className="mr-3" rel="me" href="https://hachyderm.io/@GeorgeMac">
                <FontAwesomeIcon icon={faMastodon} size="xl" />
              </A>
              <A className="mr-3" href="https://github.com/georgemac">
                <FontAwesomeIcon icon={faGithub} size="xl" />
              </A>
              <A href="https://twitter.com/georgemacr">
                <FontAwesomeIcon icon={faTwitter} size="xl" />
              </A>
            </div>
          </nav>
          <div className="flex-row">
            {children}
          </div>
        </main>

        <footer className="flex flex-row justify-center p-4">
          © George MacRorie 2022
        </footer>
      </div>
    </>
  )
}
