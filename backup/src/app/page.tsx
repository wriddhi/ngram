"use client";

import { useState } from "react";

import CSVReader from "react-csv-reader";
import csvDownload from "json-to-csv-export";

import { nGram } from "n-gram";

// WordCloud imports
import { TagCloud } from "react-tagcloud";
import ReactWordcloud from 'react-wordcloud';

import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';

type Tokens = {
  Unigrams: string;
  Bigrams: string;
  Trigrams: string;
};

type WordData = {
  text: string;
  value: number;
};

const WordCloudOptions = ["Unigrams", "Bigrams", "Trigrams"] as const;
type Result = Record<(typeof WordCloudOptions)[number], WordData[]>;

function collectDistinctWords(tokensArray: Tokens[]): Result {
  const result: Result = {
    Unigrams: [],
    Bigrams: [],
    Trigrams: [],
  };

  const uniqueUnigrams = new Map<string, number>();
  const uniqueBigrams = new Map<string, number>();
  const uniqueTrigrams = new Map<string, number>();

  tokensArray.forEach((tokens) => {
    tokens.Unigrams.split(", ").forEach((word) => {
      if (uniqueUnigrams.has(word)) {
        uniqueUnigrams.set(word, uniqueUnigrams.get(word)! + 1);
      } else {
        uniqueUnigrams.set(word, 1);
      }
    });

    tokens.Bigrams.split(", ").forEach((word) => {
      if (uniqueBigrams.has(word)) {
        uniqueBigrams.set(word, uniqueBigrams.get(word)! + 1);
      } else {
        uniqueBigrams.set(word, 1);
      }
    });

    tokens.Trigrams.split(", ").forEach((word) => {
      if (uniqueTrigrams.has(word.toLocaleLowerCase().trim())) {
        uniqueTrigrams.set(word.toLocaleLowerCase().trim(), uniqueTrigrams.get(word)! + 1);
      } else {
        uniqueTrigrams.set(word.toLocaleLowerCase().trim(), 1);
      }
    });
  });

  uniqueUnigrams.forEach((value, word) => {
    result.Unigrams.push({ text: word, value });
  });

  uniqueBigrams.forEach((value, word) => {
    result.Bigrams.push({ text: word, value });
  });

  uniqueTrigrams.forEach((value, word) => {
    result.Trigrams.push({ text: word, value });
  });


  return result;
}

const tokenify = (row: string): Tokens => {
  function unique(strings: string[]): string[] {
    return strings.filter(
      (value, index, self) => self.indexOf(value) === index
    );
  }

  if (!row)
    return {
      Unigrams: "",
      Bigrams: "",
      Trigrams: "",
    };

  const words = row.split(" ").filter((word) => word.length > 2);

  const uni = unique(
    Array.from(
      nGram(1)(words).map((item) => JSON.parse(JSON.stringify(item)).join(" "))
    )
  ).join(", ");

  const bi = unique(
    Array.from(
      nGram(2)(words).map((item) => JSON.parse(JSON.stringify(item)))
    ).map((item) => JSON.parse(JSON.stringify(item)).join(" "))
  ).join(", ");

  const tri = unique(
    Array.from(
      nGram(3)(words).map((item) => JSON.parse(JSON.stringify(item)))
    ).map((item) => JSON.parse(JSON.stringify(item)).join(" "))
  ).join(", ");

  const result: Tokens = {
    Unigrams: uni,
    Bigrams: bi,
    Trigrams: tri,
  };

  return result;
};



export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<Array<string>>([]);
  const [data, setData] = useState<Array<Array<string>>>([]);
  const [activeHeader, setActiveHeader] = useState<string>("");

  const [blackListedWords, setBlackListedWords] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string>("");

  const [tokens, setTokens] = useState<Tokens[]>([]);

  const [wordCloudView, setWordCloudView] =
    useState<(typeof WordCloudOptions)[number]>("Unigrams");

  const sanitizedTokens = tokens.map((token) => {
    const filteredUnigrams = token.Unigrams.split(", ").filter(
      (unigram) => !blackListedWords.includes(unigram)
    );

    return {
      Unigrams: filteredUnigrams.join(", "),
      Bigrams: token.Bigrams,
      Trigrams: token.Trigrams,
    };
  });

  const fileLoaded = data.length > 0;
  const downloadable = tokens.length > 0;

  const options = {
    title: "Word cloud",
    resizable: true,
    color: {
      pairing: {
        option: 3,
      },
    },
    height: "400px",
  };

  const handleData = (data: any, fileInfo: any) => {
    if (data.length === 0) return;
    setHeaders(data[0]);
    setData(data.slice(1).filter((row: any) => row));
    setFileName(fileInfo.name);
  };

  const extract = () => {
    const columnData = data.map((row) => row[headers.indexOf(activeHeader)]);

    const rowTokens = columnData.map((row) => {
      return tokenify(row);
    });

    setTokens(rowTokens);
  };

  const blacklist = () => {
    const word = exclude.trimStart().trimEnd();
    setExclude("");
    if (!word || blackListedWords.includes(word)) return;
    setBlackListedWords([...blackListedWords, word]);
  };

  const whitelist = (word: string) => {
    setBlackListedWords(blackListedWords.filter((item) => item !== word));
  };

  const download = () => {
    const csvData = data.map((row, index) => {
      let rowData = {} as any;

      headers.map((header, index) => {
        rowData[header] = row[index];
      });

      rowData = { ...rowData, ...sanitizedTokens[index] };

      return rowData;
    });



    csvDownload({
      data: csvData,
      filename: `(Extracted)${fileName}`,
      delimiter: ",",
      headers: [...headers, "Unigrams", "Bigrams", "Trigrams"],
    });
  };

  if (sanitizedTokens.length > 0) {
    console.log(collectDistinctWords(sanitizedTokens));
  }
  

  return (
    <main className="flex min-h-screen flex-col items-center justify-between gap-4 p-16">
      {!fileLoaded && (
        <CSVReader
          cssClass="outline outline-1 p-2 cursor-pointer"
          cssInputClass="cursor-pointer"
          onFileLoaded={(data, fileInfo) => {
            handleData(data, fileInfo);
          }}
        />
      )}
      {data.length > 0 && !downloadable && (
        <div className="data-table-container">

          <table className="outline outline-1 w-full mycsv">
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((item, index) => (
                    <th className="outline outline-1 p-2" key={index}>
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            {data.length > 0 && (
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    {row.map((item, index) => (
                      <td className="outline outline-1 p-2" key={index}>
                        {item}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      )}
      <section className="flex w-full justify-center items-center gap-10">
        {data.length !== 0 && (
          <select
            className="outline outline-1 p-2"
            onChange={(e) => {
              setActiveHeader(e.target.value);
            }}
          >
            <option value="" disabled selected>
              Select a column
            </option>
            {headers.map((item, index) => (
              <option key={index}>{item}</option>
            ))}
          </select>
        )}
        {activeHeader && (
          <button
            className="outline outline-1 p-2 bg-black text-white rounded-lg font-bold"
            onClick={extract}
          >
            Extract by {activeHeader}{" "}
          </button>
        )}
        {downloadable && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="text"
              placeholder="Exclude words"
              className="p-3 outline outline-1"
              value={exclude}
              onChange={(e) => {
                setExclude(e.target.value);
              }}
            />
            <button
              onClick={blacklist}
              className="p-3 bg-black text-white font-bold"
            >
              Exclude
            </button>
          </form>
        )}
        {downloadable && (
          <button
            onClick={download}
            className="outline outline-1 p-2 bg-green-500 text-white rounded-lg font-bold"
          >
            Download CSV
          </button>
        )}
        {downloadable && (
          <select
            id="cloud"
            value={wordCloudView}
            onChange={(e) =>
              setWordCloudView(
                e.target.value as (typeof WordCloudOptions)[number]
              )
            }
            className="outline outline-1 p-2"
          >
            {WordCloudOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </section>
      {blackListedWords.length > 0 && (
        <section className="grid grid-cols-[1fr_9fr] w-full">
          <span className="font-bold">Excluded words : </span>
          <ul className="flex gap-4 w-full flex-wrap">
            {blackListedWords.map((word, index) => (
              <li
                className="bg-black/10 px-3 py-1 outline-dashed outline-1 flex gap-3 items-center"
                key={index}
              >
                {word}{" "}
                <button
                  onClick={() => {
                    whitelist(word);
                  }}
                  title="Include"
                  className="font-bold"
                >
                  &#10005;
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* {downloadable && (
        <table className="outline outline-1 w-full">
          <thead>
            <tr>
              <th className="outline outline-1 p-2">Unigrams</th>
              <th className="outline outline-1 p-2">Bigrams</th>
              <th className="outline outline-1 p-2">Trigrams</th>
            </tr>
          </thead>
          <tbody>
            {sanitizedTokens.map((token, index) => (
              <tr key={index}>
                <td className="outline outline-1 p-2">{token.Unigrams}</td>
                <td className="outline outline-1 p-2">{token.Bigrams}</td>
                <td className="outline outline-1 p-2">{token.Trigrams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )} */}

      {downloadable && (
        /*     <TagCloud
               minSize={12}
               maxSize={60}
               colorOptions={options.color}
               tags={collectDistinctWords(sanitizedTokens)[wordCloudView]}
             /> */

        <ReactWordcloud
          words={collectDistinctWords(sanitizedTokens)[wordCloudView]}
        />

      )}
    </main>
  );
}


const cloudoptions = {
  fontSizes: [20,40],
  rotationAngles: [-90, 0],
};