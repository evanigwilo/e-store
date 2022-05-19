import React from "react";
import { NextComponentType } from "next";
import Image from "next/image";

import "swiper/css/swiper.css";
import Swiper from "react-id-swiper";
import styles from "../styles/Carousel.module.css";

const CoverflowEffect: NextComponentType = () => {
  const params = {
    effect: "coverflow",
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: "auto",
    mousewheel: true,
    lazy: true,
    coverflowEffect: {
      rotate: 50,
      stretch: 10,
      depth: 100,
      modifier: 1,
      slideShadows: true,
    },
    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
    },
    pagination: {
      // type: "progressbar",
      el: ".swiper-pagination",
      clickable: true,
      dynamicBullets: true,
    },
    navigation: {
      // nextEl: '.swiper-button-next',
      // prevEl: '.swiper-button-prev'
    },
  };

  const image = (index: number) => (
    <div className={styles["image"]}>
      <Image
        alt={`Image-${index}`}
        src={`/assets/images/carousel/${index}.jpg`}
        layout="fill"
      />
      <div></div>
    </div>
  );

  return (
    <div className={styles["swiper"]}>
      <Swiper {...params}>
        {image(1)}
        {image(2)}
        {image(3)}
        {image(4)}
        {image(5)}
      </Swiper>
    </div>
  );
};

export default CoverflowEffect;
