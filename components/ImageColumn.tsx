import { useState, memo, useEffect } from "react";
import { NextComponentType, NextPageContext } from "next";
import Image from "next/image";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import { Progress, reduceToValue } from "../utils/helpers";
import { darkOpacityText, slotCount } from "../utils/constants";
import ImagePreview from "./ImagePreview";

import styles from "../styles/ImageColumn.module.css";

const ImageColumn: NextComponentType<
  NextPageContext,
  {},
  {
    url?: string;
    title: string;
    text: string;
    badge?: {
      text: string;
      status: string;
    };
    flex?: string;
    paragraph?: string;
    urls?: string[];
    size?: {
      maxWidth: string;
      height: string;
    };
  }
> = (props) => {
  const { url, title, text, badge, flex, paragraph, urls, size } = props;

  const [showImagePreview, setShowImagePreview] = useState(0);
  const [loadingImage, setLoadingImage] = useState(true);

  const [activeUrl, setActiveUrl] = useState(url);
  useEffect(() => {
    setLoadingImage(true);
    setActiveUrl(url);
    setImageLoaded({});
  }, [url]);

  const [imageLoaded, setImageLoaded] = useState(
    reduceToValue(slotCount, () => false)
  );
  const imageHasLoaded = (index: number) =>
    setImageLoaded((prev) => ({
      ...prev,
      [index]: true,
    }));

  const imageStyle = size || {
    maxWidth: "200px",
    height: "100px",
  };

  // 👉 console.log("ImageColumn");

  const badgeColor =
    badge?.status === "PAYMENT SUCCEEDED"
      ? "success"
      : badge?.status === "PAYMENT CREATED"
      ? "primary"
      : badge?.status === "PAYMENT CANCELED" ||
        badge?.status === "PAYMENT FAILED"
      ? "danger"
      : "secondary";

  return (
    <Col>
      <Card
        className={
          (flex || "flex-sm-row align-items-sm-center") +
          " text-start bg-transparent border-0"
        }
      >
        {activeUrl ? (
          <div
            style={size ? imageStyle : { height: imageStyle.height }}
            className="w-100 d-flex justify-content-between gap-1"
          >
            <div
              style={{ maxWidth: imageStyle.maxWidth }}
              className="position-relative w-100"
            >
              {/* <Card.Img
                loading="lazy"
                onLoad={() => setLoadingImage(false)}
                className="w-100 h-100 rounded-3"
                src={activeUrl}
              /> */}
              <Image
                onClick={() => setShowImagePreview(1)}
                onLoadingComplete={() => setLoadingImage(false)}
                onError={() => setLoadingImage(false)}
                src={activeUrl}
                alt="No Image"
                layout="fill"
                objectFit="contain"
                className="css-mouse-enter w-100 h-100 rounded-3"
              />
              {loadingImage && (
                <div
                  className={
                    "rounded-3 fs-3 css-content-center w-100 position-absolute " +
                    "top-0 h-100 bg-dark bg-opacity-75 text-white bg-success"
                  }
                >
                  {Progress()}
                </div>
              )}
            </div>

            {urls && (
              <div className="d-flex flex-md-row flex-sm-column align-items-center gap-md-2 gap-lg-4 gap-1 mx-auto">
                <ImagePreview
                  closeButton={true}
                  setShow={setShowImagePreview}
                  show={showImagePreview}
                  src={activeUrl}
                />
                {urls.map((url, idx) => {
                  return url ? (
                    <div
                      key={idx}
                      className={
                        "position-relative " + `${styles["border-image-size"]}`
                      }
                    >
                      <Image
                        onMouseEnter={() => {
                          setActiveUrl(url);
                        }}
                        onClick={() => {
                          setActiveUrl(url);
                        }}
                        onLoadingComplete={() => imageHasLoaded(idx)}
                        role="button"
                        src={url}
                        alt={`Image-${idx}`}
                        layout="fill"
                        objectFit="contain"
                        className={"rounded-3 " + styles["border-image-style"]}
                      />
                      {!imageLoaded[idx] && (
                        <div
                          className={
                            "css-cursor-progress position-absolute css-content-center " +
                            "w-100 h-100 bg-dark bg-opacity-75 text-white rounded-3"
                          }
                        >
                          {Progress("sm")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <i
                      key={idx}
                      className={
                        "bi bi-image css-content-center " +
                        "border border-secondary rounded-3 " +
                        styles["border-image-size"]
                      }
                    ></i>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <i
            style={{ ...imageStyle, fontSize: size ? "2rem" : "4rem" }}
            className={
              "bi bi-image w-100 css-content-center " +
              "border border-secondary rounded-3"
            }
          ></i>
        )}

        <Card.Body
          className={`w-100 p-0 pt-2 text-start ${paragraph || "ps-sm-3"}`}
        >
          <Card.Title
            style={{
              fontSize: size ? "0.8rem" : "1rem",
            }}
            className={`fw-bold mb-1 css-line-number-2 text-break ${darkOpacityText}`}
          >
            {title}
          </Card.Title>
          {badge && (
            <Badge pill bg={badgeColor} className="">
              {badge.text}
            </Badge>
          )}
          <Card.Text>{text}</Card.Text>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default memo(ImageColumn);
