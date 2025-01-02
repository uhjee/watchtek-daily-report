# watchtek 파트 일간 보고 notion 연동 프로그램

## 프로젝트 개요

- 프로젝트 명 : watchtek 파트 일간 보고 notion 연동 프로그램
- 프로젝트 목적 : notion database에 입력된 파트원들의 일간보고를 자동으로 취합하는 프로그램

## 프로젝트 환경
- 프로젝트 언어: Typescript
- 프로젝트 라이브러리: Node.js, Notion API

## 프로젝트 기능

- 주요 기능 
    1. notion API를 활용해서 notion database 데이터 조회
    2. 1단계를 통해 조회한 데이터를 일간 보고 포맷으로 변환
    3. 2단계를 통해 변환된 데이터를 다시 notion database에 업데이트

- 추가 기능
    1. 위의 로직을 매일 특정 시간마다 수행

## 프로젝트 구조
- notion API 연동: notionClient.ts
- 보고서: report.ts
    - 보고서 조회: getReport()
    - 보고서 포맷 변환: formatReport()
    - 취합 보고서 생성: createDailyReport()

## notion 응답 데이터 example
```json
{
    "object": "list",
    "results": [
        {
            "object": "page",
            "id": "f068466f-f5cc-4cec-81b0-6bb9d42a29dc",
            "created_time": "2024-12-31T08:00:00.000Z",
            "last_edited_time": "2025-01-02T07:30:00.000Z",
            "created_by": {
                "object": "user",
                "id": "2461e8f5-c83a-446e-9490-269290a9623b"
            },
            "last_edited_by": {
                "object": "user",
                "id": "b30e009d-cf84-403b-b63d-4cc0039d8a2c"
            },
            "cover": null,
            "icon": {
                "type": "emoji",
                "emoji": "🟢"
            },
            "parent": {
                "type": "database_id",
                "database_id": "13a9e358-6c4e-80b4-b95c-ef6dc2fad4da"
            },
            "archived": false,
            "in_trash": false,
            "properties": {
                "Person": {
                    "id": "GVB%7D",
                    "type": "people",
                    "people": [
                        {
                            "object": "user",
                            "id": "2461e8f5-c83a-446e-9490-269290a9623b",
                            "name": "서리",
                            "avatar_url": null,
                            "type": "person",
                            "person": {
                                "email": "rlatjfgml6471@gmail.com"
                            }
                        }
                    ]
                },
                "Group": {
                    "id": "K%5Dua",
                    "type": "select",
                    "select": {
                        "id": "f2f63938-935b-4cf0-ac19-27c26264138e",
                        "name": "사이트 지원",
                        "color": "default"
                    }
                },
                "Customer": {
                    "id": "Tx%3E%5B",
                    "type": "select",
                    "select": {
                        "id": "7454103d-8078-4618-8469-6c1928d7441e",
                        "name": "나이스홀딩스",
                        "color": "yellow"
                    }
                },
                "SubGroup": {
                    "id": "WR%5CU",
                    "type": "select",
                    "select": {
                        "id": "6df3ac79-9a28-41d6-a1e2-84831cea9746",
                        "name": "구현",
                        "color": "purple"
                    }
                },
                "Progress": {
                    "id": "fUK%7D",
                    "type": "number",
                    "number": 0.2
                },
                "Date": {
                    "id": "yd%5CA",
                    "type": "date",
                    "date": {
                        "start": "2024-12-31",
                        "end": "2025-01-03",
                        "time_zone": null
                    }
                },
                "Name": {
                    "id": "title",
                    "type": "title",
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "성능/운영 자원 매핑(김설희)",
                                "link": null
                            },
                            "annotations": {
                                "bold": false,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": false,
                                "color": "default"
                            },
                            "plain_text": "성능/운영 자원 매핑(김설희)",
                            "href": null
                        }
                    ]
                }
            },
            "url": "https://www.notion.so/f068466ff5cc4cec81b06bb9d42a29dc",
            "public_url": null
        },
        {
            "object": "page",
            "id": "745f535b-e299-401a-a14e-5ca0e7591563",
            "created_time": "2024-12-31T06:22:00.000Z",
            "last_edited_time": "2025-01-02T07:31:00.000Z",
            "created_by": {
                "object": "user",
                "id": "a4ec1b96-c9c6-4a4e-b43d-4ede0f0a1f3c"
            },
            "last_edited_by": {
                "object": "user",
                "id": "b30e009d-cf84-403b-b63d-4cc0039d8a2c"
            },
            "cover": null,
            "icon": null,
            "parent": {
                "type": "database_id",
                "database_id": "13a9e358-6c4e-80b4-b95c-ef6dc2fad4da"
            },
            "archived": false,
            "in_trash": false,
            "properties": {
                "Person": {
                    "id": "GVB%7D",
                    "type": "people",
                    "people": [
                        {
                            "object": "user",
                            "id": "a4ec1b96-c9c6-4a4e-b43d-4ede0f0a1f3c",
                            "name": "dongyub lee",
                            "avatar_url": null,
                            "type": "person",
                            "person": {
                                "email": "ldyydl@inu.ac.kr"
                            }
                        }
                    ]
                },
                "Group": {
                    "id": "K%5Dua",
                    "type": "select",
                    "select": {
                        "id": "f2f63938-935b-4cf0-ac19-27c26264138e",
                        "name": "사이트 지원",
                        "color": "default"
                    }
                },
                "Customer": {
                    "id": "Tx%3E%5B",
                    "type": "select",
                    "select": {
                        "id": "7454103d-8078-4618-8469-6c1928d7441e",
                        "name": "나이스홀딩스",
                        "color": "yellow"
                    }
                },
                "SubGroup": {
                    "id": "WR%5CU",
                    "type": "select",
                    "select": {
                        "id": "6df3ac79-9a28-41d6-a1e2-84831cea9746",
                        "name": "구현",
                        "color": "purple"
                    }
                },
                "Progress": {
                    "id": "fUK%7D",
                    "type": "number",
                    "number": 0.5
                },
                "Date": {
                    "id": "yd%5CA",
                    "type": "date",
                    "date": {
                        "start": "2024-12-31",
                        "end": null,
                        "time_zone": null
                    }
                },
                "Name": {
                    "id": "title",
                    "type": "title",
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "[나이스홀딩스] 커스텀대시보드 쿼리 전달",
                                "link": null
                            },
                            "annotations": {
                                "bold": false,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": false,
                                "color": "default"
                            },
                            "plain_text": "[나이스홀딩스] 커스텀대시보드 쿼리 전달",
                            "href": null
                        }
                    ]
                }
            },
            "url": "https://www.notion.so/745f535be299401aa14e5ca0e7591563",
            "public_url": null
        },
        {
            "object": "page",
            "id": "1659e358-6c4e-80b4-b4ea-d30d922a4c75",
            "created_time": "2024-12-23T02:18:00.000Z",
            "last_edited_time": "2024-12-23T02:18:00.000Z",
            "created_by": {
                "object": "user",
                "id": "b30e009d-cf84-403b-b63d-4cc0039d8a2c"
            },
            "last_edited_by": {
                "object": "user",
                "id": "b30e009d-cf84-403b-b63d-4cc0039d8a2c"
            },
            "cover": null,
            "icon": {
                "type": "emoji",
                "emoji": "🟥"
            },
            "parent": {
                "type": "database_id",
                "database_id": "13a9e358-6c4e-80b4-b95c-ef6dc2fad4da"
            },
            "archived": false,
            "in_trash": false,
            "properties": {
                "Person": {
                    "id": "GVB%7D",
                    "type": "people",
                    "people": []
                },
                "Group": {
                    "id": "K%5Dua",
                    "type": "select",
                    "select": null
                },
                "Customer": {
                    "id": "Tx%3E%5B",
                    "type": "select",
                    "select": null
                },
                "SubGroup": {
                    "id": "WR%5CU",
                    "type": "select",
                    "select": null
                },
                "Progress": {
                    "id": "fUK%7D",
                    "type": "number",
                    "number": null
                },
                "Date": {
                    "id": "yd%5CA",
                    "type": "date",
                    "date": {
                        "start": "2025-01-01",
                        "end": null,
                        "time_zone": null
                    }
                },
                "Name": {
                    "id": "title",
                    "type": "title",
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "신정",
                                "link": null
                            },
                            "annotations": {
                                "bold": false,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": false,
                                "color": "default"
                            },
                            "plain_text": "신정",
                            "href": null
                        }
                    ]
                }
            },
            "url": "https://www.notion.so/1659e3586c4e80b4b4ead30d922a4c75",
            "public_url": null
        }
    ],
    "next_cursor": null,
    "has_more": false,
    "type": "page_or_database",
    "page_or_database": {},
    "developer_survey": "https://notionup.typeform.com/to/bllBsoI4?utm_source=postman",
    "request_id": "3c96a89b-a815-4485-af70-10462e275a0c"
}
```
